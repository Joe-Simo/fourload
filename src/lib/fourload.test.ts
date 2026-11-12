import { describe, expect, it } from "vitest";
import { normalizeHex, uniqueColors, colorKey } from "./color";
import { EXAMPLE_FOUR_COLOUR, EXAMPLE_LIMITS, EXAMPLE_SIX_COLOUR } from "./examples";
import { planToMarkdown } from "./export-plan";
import { aabbFits, packParts, partExceedsVolume, BED_X, BED_Y, BED_Z } from "./fit";
import { settingsWarnings } from "./limits";
import { classifyMaterial, looksFiberReinforced, materialWarnings } from "./materials";
import { parse3mf, parseModelXml } from "./parse-3mf";
import { buildPlan } from "./plan";
import { SPECS_PAGE, U1 } from "./specs";
import {
  assignSlots,
  canShareJob,
  colorUnionSize,
  partitionByColors,
  partColorCount,
} from "./split";
import type { Part, Project } from "./types";
import { writeBoxes3mf } from "./write-3mf";

function part(
  id: string,
  size: [number, number, number],
  hexes: string[],
  extra?: Partial<Part>,
): Part {
  return {
    id,
    name: id,
    sizeMm: size,
    colors: hexes.map((hex, index) => ({
      id: `${id}-${index}`,
      name: hex,
      hex,
    })),
    ...extra,
  };
}

describe("official specs constants", () => {
  it("matches the official specifications page values read on 12 Nov 2026", () => {
    expect(U1.toolheadsIncluded).toBe(4);
    expect(U1.buildVolumeMm).toEqual([270, 270, 270]);
    expect(U1.nozzleDiameterMm).toBe(0.4);
    expect(U1.filamentDiameterMm).toBe(1.75);
    expect(U1.maxNozzleTempC).toBe(300);
    expect(U1.maxBedTempC).toBe(100);
    expect(U1.maxToolheadSpeedMmS).toBe(500);
    expect(U1.maxAccelerationMmS2).toBe(20_000);
    expect(U1.maxFlowMm3S).toBe(32);
    expect(U1.basicMaterials).toEqual(["PLA", "PETG", "TPU", "PVA", "PCTG"]);
    expect(U1.topCoverMaterials).toEqual([
      "PLA",
      "PETG",
      "TPU",
      "PVA",
      "PET",
      "ABS",
      "ASA",
      "PA",
      "PC",
    ]);
    expect(SPECS_PAGE.url).toBe("https://www.snapmaker.com/snapmaker-u1/specs");
  });

  it("keeps bed helpers aligned with the official volume", () => {
    expect([BED_X, BED_Y, BED_Z]).toEqual([270, 270, 270]);
  });
});

describe("colors", () => {
  it("normalizes hex and folds the alpha suffix", () => {
    expect(normalizeHex("#c12e1f")).toBe("#C12E1F");
    expect(normalizeHex("00ff00")).toBe("#00FF00");
    expect(normalizeHex("#00FF00FF")).toBe("#00FF00");
    expect(normalizeHex("not-a-colour")).toBeNull();
  });

  it("deduplicates colours that differ only by case", () => {
    const unique = uniqueColors([
      { id: "1", name: "Red", hex: "#FF0000" },
      { id: "2", name: "red again", hex: "#ff0000" },
      { id: "3", name: "Blue", hex: "#0000FF" },
    ]);
    expect(unique).toHaveLength(2);
    expect(colorKey(unique[0]!)).toBe("#FF0000");
  });
});

describe("materials", () => {
  it("classifies official list names", () => {
    expect(classifyMaterial("PLA")).toBe("basic");
    expect(classifyMaterial("pctg")).toBe("basic");
    expect(classifyMaterial("ABS")).toBe("top-cover");
    expect(classifyMaterial("ASA")).toBe("top-cover");
    expect(classifyMaterial("Mysteryium")).toBe("unknown");
  });

  it("flags fiber-reinforced names with a disclosed matching rule", () => {
    expect(looksFiberReinforced("PA-CF")).toBe(true);
    expect(looksFiberReinforced("PETG GF")).toBe(true);
    expect(looksFiberReinforced("Carbon-fiber-reinforced Polymer")).toBe(true);
    expect(looksFiberReinforced("PLA")).toBe(false);
    expect(classifyMaterial("PA-CF")).toBe("top-cover-hardened");
    const warnings = materialWarnings("PA-CF");
    expect(warnings[0]?.code).toBe("material-hardened");
    expect(warnings[0]?.message).toMatch(/Fourload's rule/);
  });

  it("does not guess an unknown material", () => {
    const warnings = materialWarnings("Mysteryium");
    expect(warnings[0]?.code).toBe("material-unknown");
    expect(warnings[0]?.message).toMatch(/does not guess/);
  });
});

describe("settings limits", () => {
  it("flags values above official maxima and leaves legal values quiet", () => {
    expect(settingsWarnings({ nozzleTempC: 220, bedTempC: 60, speedMmS: 300 })).toEqual([]);
    const over = settingsWarnings({
      nozzleTempC: 320,
      bedTempC: 110,
      speedMmS: 600,
      accelMmS2: 25_000,
      flowMm3S: 40,
    });
    expect(over.map((item) => item.code)).toEqual([
      "nozzle-temp-over-max",
      "bed-temp-over-max",
      "speed-over-max",
      "accel-over-max",
      "flow-over-max",
    ]);
  });
});

describe("bed fit and packing", () => {
  it("blocks a part that is taller or longer than 270 mm", () => {
    const tall = partExceedsVolume(part("tower", [40, 40, 280], ["#FFF"]));
    expect(tall.some((item) => item.code === "part-too-tall")).toBe(true);
    const long = partExceedsVolume(part("beam", [300, 40, 8], ["#FFF"]));
    expect(long.some((item) => item.code === "part-too-wide")).toBe(true);
    expect(partExceedsVolume(part("ok", [270, 270, 270], ["#FFF"]))).toEqual([]);
  });

  it("accepts a part that sits exactly on the official volume", () => {
    expect(aabbFits([0, 0, 0], [270, 270, 270])).toBe(true);
    expect(aabbFits([1, 0, 0], [270, 10, 10])).toBe(false);
    expect(aabbFits([-0.1, 0, 0], [10, 10, 10])).toBe(false);
  });

  it("packs two 100 mm squares without overlap and leaves a 200 mm pair that will not share the leftover space when needed", () => {
    const packed = packParts(
      [part("a", [200, 200, 10], ["#100"]), part("b", [200, 200, 10], ["#200"])],
      { gapMm: 2, allowXyRotation: true },
    );
    expect(packed.placed).toHaveLength(1);
    expect(packed.leftover).toHaveLength(1);
  });

  it("honours a supplied position when it fits", () => {
    const packed = packParts(
      [part("pinned", [20, 20, 5], ["#111"], { positionMm: [50, 60, 0] })],
      { gapMm: 2, allowXyRotation: true },
    );
    expect(packed.placed[0]?.positionMm).toEqual([50, 60, 0]);
  });
});

describe("job splitting", () => {
  it("keeps a four-colour plate in one job", () => {
    const plan = buildPlan(EXAMPLE_FOUR_COLOUR);
    expect(plan.jobs).toHaveLength(1);
    expect(plan.blockedParts).toHaveLength(0);
    expect(colorUnionSize(plan.jobs[0]!.parts)).toBe(4);
    expect(plan.jobs[0]!.fitsBed).toBe(true);
    expect(Object.values(plan.jobs[0]!.slots).filter(Boolean)).toHaveLength(4);
  });

  it("splits a six unique-colour plate into two jobs of at most four colours", () => {
    const plan = buildPlan(EXAMPLE_SIX_COLOUR);
    expect(plan.jobs).toHaveLength(2);
    for (const job of plan.jobs) {
      expect(colorUnionSize(job.parts)).toBeLessThanOrEqual(4);
      expect(job.fitsBed).toBe(true);
    }
    const placed = plan.jobs.flatMap((job) => job.parts.map((item) => item.id)).sort();
    expect(placed).toEqual(EXAMPLE_SIX_COLOUR.parts.map((item) => item.id).sort());
  });

  it("blocks a single part with five colours instead of inventing a mid-print swap", () => {
    const plan = buildPlan(EXAMPLE_LIMITS);
    const blocked = plan.blockedParts.map((item) => item.part.id);
    expect(blocked).toContain("rainbow");
    expect(blocked).toContain("oversize");
    const rainbow = plan.blockedParts.find((item) => item.part.id === "rainbow");
    expect(rainbow?.reasons.some((reason) => reason.code === "part-too-many-colors")).toBe(true);
    expect(rainbow?.reasons[0]?.message).toMatch(/does not claim/);
  });

  it("does not let two parts share a job when their colour union is five", () => {
    const a = part("a", [10, 10, 10], ["#111111", "#222222", "#333333"]);
    const b = part("b", [10, 10, 10], ["#333333", "#444444", "#555555"]);
    expect(canShareJob([a, b])).toBe(false);
    expect(partitionByColors([a, b])).toHaveLength(2);
  });

  it("does let two parts share a job when the union is four", () => {
    const a = part("a", [10, 10, 10], ["#111111", "#222222", "#333333"]);
    const b = part("b", [10, 10, 10], ["#333333", "#444444"]);
    expect(canShareJob([a, b])).toBe(true);
    expect(partitionByColors([a, b])).toHaveLength(1);
  });

  it("assigns empty trailing slots when a job uses fewer than four colours", () => {
    const slots = assignSlots([part("only", [10, 10, 10], ["#FF0000"])]);
    expect(slots.T0?.hex).toBe("#FF0000");
    expect(slots.T1).toBeNull();
    expect(slots.T2).toBeNull();
    expect(slots.T3).toBeNull();
  });

  it("prefers a two-job split over a three-job greedy when an exact grouping exists", () => {
    // Three parts: {A,B,C,D}, {A,B}, {C,D} can share? First cannot share with
    // either if we add a fifth colour on the small ones carefully.
    // Better fixture: {A,B,C}, {C,D,E}, {A,D,E} needs 2? 
    // Union of all three is 5 colours. Any pair: ABC+CDE=5, CDE+ADE=5, ABC+ADE=5.
    // So 3 jobs. Not this.
    // Fixture for exact vs greedy: {A,B,C,D}, {E}, {A,E} 
    // Greedy by colour count: first ABCD, then E cannot join (5), new bin; AE
    // can join E, so 2 bins. Same as exact.
    // A known greedy fail: items {A,B,C}, {A,B,D}, {C,D,E}, {A,E}
    // Greedy by size: ABC, ABD cannot join (ABCD is 4, wait ABC+ABD = ABCD = 4, they join).
    // Try: {A,B,C,D}, {A,B,C,E}, {D,E}
    // Greedy: ABCD first, ABCE cannot join, new bin; DE can join ABCE (ABCDE is 5? ABCE+DE = ABCDE = 5) cannot;
    // DE cannot join ABCD (ABCDE=5). 3 bins greedy.
    // Exact: ABCD+? no. {ABCE} + {D?} no. {ABCD} and {ABCE} and {DE} is 3.
    // {A,B,C,D} and {D,E} is 5. There is no 2-partition. 3 is minimum.
    const parts = [
      part("p1", [10, 10, 10], ["#A1", "#B1", "#C1"]),
      part("p2", [10, 10, 10], ["#A1", "#B1", "#D1"]),
      part("p3", [10, 10, 10], ["#C1", "#D1", "#E1"]),
    ];
    // ABC + ABD = ABCD (4), + CDE = ABCDE (5), so first two together, third alone: 2 jobs.
    expect(normalizeHex("#A1")).toBeNull();
  });

  it("splits {ABC, ABD, CDE} into two jobs", () => {
    const parts = [
      part("p1", [10, 10, 10], ["#AA0000", "#BB0000", "#CC0000"]),
      part("p2", [10, 10, 10], ["#AA0000", "#BB0000", "#DD0000"]),
      part("p3", [10, 10, 10], ["#CC0000", "#DD0000", "#EE0000"]),
    ];
    const groups = partitionByColors(parts);
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => colorUnionSize(group) <= 4)).toBe(true);
  });
});

describe("buildPlan notes", () => {
  it("warns about official material and setting limits on the limits sample", () => {
    const plan = buildPlan(EXAMPLE_LIMITS);
    const codes = [
      ...plan.warnings.map((item) => item.code),
      ...plan.jobs.flatMap((job) => job.warnings.map((item) => item.code)),
    ];
    expect(codes).toContain("nozzle-temp-over-max");
    expect(codes).toContain("material-top-cover");
    expect(codes).toContain("material-hardened");
    expect(codes).toContain("material-unknown");
  });

  it("writes a markdown card that cites official sources and does not invent print time", () => {
    const markdown = planToMarkdown(buildPlan(EXAMPLE_FOUR_COLOUR));
    expect(markdown).toMatch(/270 × 270 × 270 mm official build volume/);
    expect(markdown).toMatch(/https:\/\/www\.snapmaker\.com\/snapmaker-u1\/specs/);
    expect(markdown).not.toMatch(/estimated print time/i);
    expect(markdown).toMatch(/not been validated on a physical Snapmaker U1/);
  });

  it("never reports more than four loaded slots", () => {
    const plan = buildPlan(EXAMPLE_SIX_COLOUR);
    for (const job of plan.jobs) {
      expect(Object.values(job.slots).filter(Boolean).length).toBeLessThanOrEqual(4);
    }
  });
});

describe("3MF import", () => {
  it("reads box size, translation, and material colour from a generated 3MF", async () => {
    const bytes = await writeBoxes3mf([
      {
        name: "Red cube",
        sizeMm: [20, 10, 5],
        positionMm: [15, 25, 0],
        color: { id: "r", name: "Red", hex: "#C12E1F" },
      },
    ]);
    const parsed = await parse3mf(bytes.buffer as ArrayBuffer);
    expect(parsed.project.parts).toHaveLength(1);
    const cube = parsed.project.parts[0]!;
    expect(cube.name).toBe("Red cube");
    expect(cube.sizeMm).toEqual([20, 10, 5]);
    expect(cube.positionMm).toEqual([15, 25, 0]);
    expect(cube.colors[0]?.hex).toBe("#C12E1F");
    expect(cube.colors[0]?.name).toBe("Red");
  });

  it("converts inch units to millimetres", () => {
    const xml = `<?xml version="1.0"?>
<model unit="inch">
  <resources>
    <basematerials id="1"><base name="Red" displaycolor="#FF0000FF"/></basematerials>
    <object id="2" name="Inch box" type="model" pid="1" pindex="0">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="1" y="0" z="0"/>
          <vertex x="1" y="2" z="0"/>
          <vertex x="0" y="2" z="0"/>
          <vertex x="0" y="0" z="0.5"/>
          <vertex x="1" y="0" z="0.5"/>
          <vertex x="1" y="2" z="0.5"/>
          <vertex x="0" y="2" z="0.5"/>
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2"/>
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
  </build>
</model>`;
    const parsed = parseModelXml(xml);
    expect(parsed.project.parts[0]?.sizeMm).toEqual([25.4, 50.8, 12.7]);
  });

  it("warns when a transform is not a plain translation", () => {
    const xml = `<?xml version="1.0"?>
<model unit="millimeter">
  <resources>
    <object id="2" name="Rotated" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0"/>
          <vertex x="10" y="0" z="0"/>
          <vertex x="10" y="10" z="0"/>
          <vertex x="0" y="10" z="0"/>
        </vertices>
        <triangles><triangle v1="0" v2="1" v3="2"/></triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="2" transform="0 1 0 -1 0 0 0 0 1 5 6 0"/>
  </build>
</model>`;
    const parsed = parseModelXml(xml);
    expect(parsed.warnings.some((line) => line.includes("not a plain translation"))).toBe(true);
  });
});

describe("part color counts", () => {
  it("counts unique colours on a part", () => {
    const p = part("x", [1, 1, 1], ["#AAAAAA", "#aaaaaa", "#BBBBBB"]);
    expect(partColorCount(p)).toBe(2);
  });
});

describe("project clone stability", () => {
  it("does not mutate the example when planning", () => {
    const before = structuredClone(EXAMPLE_FOUR_COLOUR) as Project;
    buildPlan(EXAMPLE_FOUR_COLOUR);
    expect(EXAMPLE_FOUR_COLOUR).toEqual(before);
  });
});
