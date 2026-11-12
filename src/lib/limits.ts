import { SPECS_PAGE, U1 } from "./specs";
import type { ProjectSettings, Warning } from "./types";

export function settingsWarnings(settings: ProjectSettings | undefined): Warning[] {
  if (!settings) return [];
  const warnings: Warning[] = [];
  const source = SPECS_PAGE;

  const checks: Array<{
    value: number | undefined;
    max: number;
    code: string;
    label: string;
    unit: string;
  }> = [
    {
      value: settings.nozzleTempC,
      max: U1.maxNozzleTempC,
      code: "nozzle-temp",
      label: "Nozzle temperature",
      unit: "°C",
    },
    {
      value: settings.bedTempC,
      max: U1.maxBedTempC,
      code: "bed-temp",
      label: "Bed temperature",
      unit: "°C",
    },
    {
      value: settings.speedMmS,
      max: U1.maxToolheadSpeedMmS,
      code: "speed",
      label: "Toolhead speed",
      unit: "mm/s",
    },
    {
      value: settings.accelMmS2,
      max: U1.maxAccelerationMmS2,
      code: "accel",
      label: "Acceleration",
      unit: "mm/s²",
    },
    {
      value: settings.flowMm3S,
      max: U1.maxFlowMm3S,
      code: "flow",
      label: "Hot end flow",
      unit: "mm³/s",
    },
  ];

  for (const check of checks) {
    if (check.value == null) continue;
    if (check.value > check.max) {
      warnings.push({
        level: "warn",
        code: `${check.code}-over-max`,
        source,
        message: `${check.label} is set to ${check.value} ${check.unit}, which is above the official maximum of ${check.max} ${check.unit}.`,
      });
    }
  }

  if (
    settings.nozzleDiameterMm != null &&
    settings.nozzleDiameterMm !== U1.nozzleDiameterMm
  ) {
    warnings.push({
      level: "info",
      code: "nozzle-not-stock",
      source,
      message: `Nozzle diameter is set to ${settings.nozzleDiameterMm} mm. The official specifications list the stock nozzle diameter as ${U1.nozzleDiameterMm} mm. Fourload does not treat other diameters as official or unofficial.`,
    });
  }

  if (
    settings.filamentDiameterMm != null &&
    settings.filamentDiameterMm !== U1.filamentDiameterMm
  ) {
    warnings.push({
      level: "warn",
      code: "filament-diameter",
      source,
      message: `Filament diameter is set to ${settings.filamentDiameterMm} mm. The official specifications list ${U1.filamentDiameterMm} mm.`,
    });
  }

  return warnings;
}
