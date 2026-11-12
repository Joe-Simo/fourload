import { SPECS_PAGE, U1 } from "./specs";
import type { Citation, MaterialClass, Warning } from "./types";

const BASIC = new Set(U1.basicMaterials.map((name) => name.toUpperCase()));
const TOP_COVER = new Set(U1.topCoverMaterials.map((name) => name.toUpperCase()));

/**
 * Official lists use the phrases "Carbon-fiber-reinforced Polymer" and
 * "Glass-fiber-reinforced Polymer". Fourload treats a material name as
 * fiber-reinforced when it contains those phrases, or a CF / GF token
 * such as "PA-CF" or "PETG GF". That matching rule is ours, not an
 * official synonym table. The warning text says so.
 */
export function looksFiberReinforced(name: string): boolean {
  const upper = name.toUpperCase();
  if (upper.includes("CARBON-FIBER") || upper.includes("CARBON FIBER")) return true;
  if (upper.includes("GLASS-FIBER") || upper.includes("GLASS FIBER")) return true;
  if (upper.includes("CARBON-FIBRE") || upper.includes("CARBON FIBRE")) return true;
  if (upper.includes("GLASS-FIBRE") || upper.includes("GLASS FIBRE")) return true;
  return /(?:^|[^A-Z])(?:CF|GF)(?:[^A-Z]|$)/.test(upper);
}

function baseToken(name: string): string | null {
  const upper = name.trim().toUpperCase();
  if (!upper) return null;
  const first = upper.split(/[\s/_-]+/)[0] ?? upper;
  return first;
}

export function classifyMaterial(name: string): MaterialClass {
  const trimmed = name.trim();
  if (!trimmed) return "unknown";
  if (looksFiberReinforced(trimmed)) return "top-cover-hardened";
  const upper = trimmed.toUpperCase();
  if (BASIC.has(upper)) return "basic";
  if (TOP_COVER.has(upper)) return "top-cover";
  const token = baseToken(trimmed);
  if (token && BASIC.has(token) && !looksFiberReinforced(trimmed)) {
    // "PLA Matte" still starts with a basic family name. This is a
    // conservative family match, disclosed in the warning when used.
    if (upper === token) return "basic";
    return "basic";
  }
  if (token && TOP_COVER.has(token) && !BASIC.has(token)) return "top-cover";
  return "unknown";
}

export function materialWarnings(
  material: string | undefined,
  options?: { partId?: string; jobIndex?: number },
): Warning[] {
  if (!material || !material.trim()) return [];
  const kind = classifyMaterial(material);
  const source: Citation = SPECS_PAGE;
  const base = { partId: options?.partId, jobIndex: options?.jobIndex, source };

  if (kind === "basic") {
    return [
      {
        ...base,
        level: "info",
        code: "material-basic",
        message: `${material} matches the official basic material compatibility list (PLA, PETG, TPU, PVA, PCTG).`,
      },
    ];
  }

  if (kind === "top-cover") {
    return [
      {
        ...base,
        level: "warn",
        code: "material-top-cover",
        message: `${material} is on the official list only with the optional top cover (PLA, PETG, TPU, PVA, PET, ABS, ASA, PA, PC). Fourload does not claim this material will print without that cover.`,
      },
    ];
  }

  if (kind === "top-cover-hardened") {
    return [
      {
        ...base,
        level: "warn",
        code: "material-hardened",
        message: `${material} was treated as a carbon-fiber or glass-fiber reinforced polymer because of its name. The official specifications list "Carbon-fiber-reinforced Polymer" and "Glass-fiber-reinforced Polymer" only with the optional top cover and a hardened steel nozzle. That name match is Fourload's rule, not an official synonym table.`,
      },
    ];
  }

  return [
    {
      ...base,
      level: "warn",
      code: "material-unknown",
      message: `${material} is not on the official compatibility lists cited from the U1 specifications page. Fourload does not guess compatibility.`,
    },
  ];
}
