import type { Project } from "./types";

export const EXAMPLE_FOUR_COLOUR: Project = {
  name: "Four-colour badge plate",
  settings: { gapMm: 2, allowXyRotation: true, nozzleTempC: 220, bedTempC: 60 },
  parts: [
    {
      id: "badge",
      name: "Badge body",
      sizeMm: [80, 80, 8],
      colors: [{ id: "red", name: "Red", hex: "#C12E1F" }],
      material: "PLA",
    },
    {
      id: "letter",
      name: "Letter inlay",
      sizeMm: [40, 40, 4],
      colors: [{ id: "white", name: "White", hex: "#F5F5F5" }],
      material: "PLA",
    },
    {
      id: "ring",
      name: "Accent ring",
      sizeMm: [90, 12, 3],
      colors: [{ id: "gold", name: "Gold", hex: "#D4A017" }],
      material: "PLA",
    },
    {
      id: "pin",
      name: "Back pin",
      sizeMm: [20, 8, 6],
      colors: [{ id: "black", name: "Black", hex: "#1A1A1A" }],
      material: "PLA",
    },
  ],
};

export const EXAMPLE_SIX_COLOUR: Project = {
  name: "Six-colour tabletop set",
  settings: { gapMm: 2, allowXyRotation: true },
  parts: [
    {
      id: "board",
      name: "Game board",
      sizeMm: [180, 180, 4],
      colors: [{ id: "green", name: "Green", hex: "#2E7D32" }],
      material: "PLA",
    },
    {
      id: "pawn-red",
      name: "Red pawn",
      sizeMm: [20, 20, 32],
      colors: [{ id: "red", name: "Red", hex: "#C62828" }],
      material: "PLA",
    },
    {
      id: "pawn-blue",
      name: "Blue pawn",
      sizeMm: [20, 20, 32],
      colors: [{ id: "blue", name: "Blue", hex: "#1565C0" }],
      material: "PLA",
    },
    {
      id: "pawn-yellow",
      name: "Yellow pawn",
      sizeMm: [20, 20, 32],
      colors: [{ id: "yellow", name: "Yellow", hex: "#F9A825" }],
      material: "PLA",
    },
    {
      id: "token-white",
      name: "White token",
      sizeMm: [24, 24, 3],
      colors: [{ id: "white", name: "White", hex: "#FAFAFA" }],
      material: "PLA",
    },
    {
      id: "token-black",
      name: "Black token",
      sizeMm: [24, 24, 3],
      colors: [{ id: "black", name: "Black", hex: "#111111" }],
      material: "PLA",
    },
  ],
};

export const EXAMPLE_LIMITS: Project = {
  name: "Limit and material checks",
  settings: {
    gapMm: 2,
    nozzleTempC: 320,
    bedTempC: 110,
    speedMmS: 600,
    accelMmS2: 25_000,
    flowMm3S: 40,
  },
  parts: [
    {
      id: "abs-housing",
      name: "ABS housing",
      sizeMm: [100, 60, 40],
      colors: [{ id: "grey", name: "Grey", hex: "#757575" }],
      material: "ABS",
    },
    {
      id: "cf-clip",
      name: "PA-CF clip",
      sizeMm: [40, 16, 8],
      colors: [{ id: "cf", name: "Black CF", hex: "#222222" }],
      material: "PA-CF",
    },
    {
      id: "mystery",
      name: "Unlisted polymer",
      sizeMm: [30, 30, 10],
      colors: [{ id: "orange", name: "Orange", hex: "#EF6C00" }],
      material: "Mysteryium",
    },
    {
      id: "oversize",
      name: "Oversize panel",
      sizeMm: [300, 80, 4],
      colors: [{ id: "blue", name: "Blue", hex: "#1565C0" }],
      material: "PLA",
    },
    {
      id: "rainbow",
      name: "Five-colour charm",
      sizeMm: [40, 40, 12],
      colors: [
        { id: "c1", name: "Red", hex: "#C62828" },
        { id: "c2", name: "Blue", hex: "#1565C0" },
        { id: "c3", name: "Yellow", hex: "#F9A825" },
        { id: "c4", name: "White", hex: "#FAFAFA" },
        { id: "c5", name: "Green", hex: "#2E7D32" },
      ],
      material: "PLA",
    },
  ],
};

export const EXAMPLES: Record<string, Project> = {
  "four-colour": EXAMPLE_FOUR_COLOUR,
  "six-colour": EXAMPLE_SIX_COLOUR,
  limits: EXAMPLE_LIMITS,
};

export function cloneProject(project: Project): Project {
  return structuredClone(project);
}
