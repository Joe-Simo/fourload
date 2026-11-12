export type HexColor = string;

export type Color = {
  id: string;
  name: string;
  hex: HexColor;
};

export type Part = {
  id: string;
  name: string;
  sizeMm: [number, number, number];
  positionMm?: [number, number, number];
  colors: Color[];
  material?: string;
};

export type ProjectSettings = {
  nozzleTempC?: number;
  bedTempC?: number;
  speedMmS?: number;
  accelMmS2?: number;
  flowMm3S?: number;
  nozzleDiameterMm?: number;
  filamentDiameterMm?: number;
  /** Layout spacing in millimetres. This is a planner aid, not an official U1 clearance. */
  gapMm?: number;
  /** When true, the packer may swap a part's X and Y. Default true. */
  allowXyRotation?: boolean;
};

export type Project = {
  name: string;
  parts: Part[];
  settings?: ProjectSettings;
};

export const TOOL_SLOTS = ["T0", "T1", "T2", "T3"] as const;
export type ToolSlot = (typeof TOOL_SLOTS)[number];

export type WarningLevel = "info" | "warn" | "block";

export type Citation = {
  label: string;
  url: string;
};

export type Warning = {
  level: WarningLevel;
  code: string;
  message: string;
  partId?: string;
  jobIndex?: number;
  source?: Citation;
};

export type PlacedPart = Part & {
  positionMm: [number, number, number];
  sizeMm: [number, number, number];
  rotatedXy: boolean;
};

export type Job = {
  index: number;
  parts: PlacedPart[];
  slots: Record<ToolSlot, Color | null>;
  fitsBed: boolean;
  warnings: Warning[];
};

export type BlockedPart = {
  part: Part;
  reasons: Warning[];
};

export type Plan = {
  projectName: string;
  jobs: Job[];
  blockedParts: BlockedPart[];
  warnings: Warning[];
};

export type MaterialClass =
  | "basic"
  | "top-cover"
  | "top-cover-hardened"
  | "unknown";
