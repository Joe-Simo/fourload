import type { Citation } from "./types";

/** Date the official pages below were read for this release. */
export const SPECS_READ_ON = "2026-11-12";

export const SPECS_PAGE: Citation = {
  label: "Official Snapmaker U1 specifications",
  url: "https://www.snapmaker.com/snapmaker-u1/specs",
};

export const PRODUCT_PAGE: Citation = {
  label: "Official Snapmaker U1 product page",
  url: "https://www.snapmaker.com/snapmaker-u1",
};

export const OFFICIAL_FAQ: Citation = {
  label: "Official U1 FAQ summary on the Snapmaker Forum",
  url: "https://forum.snapmaker.com/t/u1-faq-official-info-summary/39648",
};

export const U1 = {
  toolheadsIncluded: 4,
  buildVolumeMm: [270, 270, 270] as const,
  usableBedMm: [270, 270] as const,
  nozzleDiameterMm: 0.4,
  filamentDiameterMm: 1.75,
  maxNozzleTempC: 300,
  maxBedTempC: 100,
  maxToolheadSpeedMmS: 500,
  maxAccelerationMmS2: 20_000,
  maxFlowMm3S: 32,
  typicalSwapSeconds: 5,
  basicMaterials: ["PLA", "PETG", "TPU", "PVA", "PCTG"] as const,
  topCoverMaterials: [
    "PLA",
    "PETG",
    "TPU",
    "PVA",
    "PET",
    "ABS",
    "ASA",
    "PA",
    "PC",
  ] as const,
  hardenedAdds: [
    "Carbon-fiber-reinforced Polymer",
    "Glass-fiber-reinforced Polymer",
  ] as const,
} as const;

export const SPEC_NOTES = {
  usableBed: {
    text: "The official FAQ states: \"The actual usable bed size is 270mm*270mm.\"",
    source: OFFICIAL_FAQ,
  },
  hotends: {
    text: "The official FAQ states that the U1 ships with 4 x 0.4 mm proprietary stainless hotends, plus one spare hotend.",
    source: OFFICIAL_FAQ,
  },
  swapTime: {
    text: "The official product page says four independent, preheated toolheads let U1 switch colors and materials in just 5 seconds. Footnote [1] on that page says: \"This is a typical result from Snapmaker Lab tests and is for reference only.\" Fourload does not treat this figure as a measured job time.",
    source: PRODUCT_PAGE,
  },
  primeTower: {
    text: "Footnote [2] on the official product page says a prime or wiping tower built during a colour change is not what Snapmaker defines as purging for colour change. Fourload does not estimate tower mass or size.",
    source: PRODUCT_PAGE,
  },
  wasteClaim: {
    text: "Footnote [3] on the official product page says that in Snapmaker Lab tests under similar conditions, the U1 used up to 85% less filament than printers using shared-nozzle filament switching for the same multi-color prints. Filament usage may vary with model size, color layout, and print settings. This is Snapmaker's published lab claim, not a Fourload measurement.",
    source: PRODUCT_PAGE,
  },
  maxFlow: {
    text: "The official specifications page lists Max Flow for Hot End as 32 mm³/s. That page marks the figure with a footnote marker. The notes list is published on the product page, not on the specifications page, so Fourload cites the number and the specifications URL only.",
    source: SPECS_PAGE,
  },
} as const;
