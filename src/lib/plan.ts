import { aabbFits } from "./fit";
import { settingsWarnings } from "./limits";
import { materialWarnings } from "./materials";
import { SPECS_PAGE, U1 } from "./specs";
import { assignSlots, splitIntoJobs } from "./split";
import type { Job, Plan, Project, Warning } from "./types";

export function buildPlan(project: Project): Plan {
  const gapMm = project.settings?.gapMm ?? 2;
  const allowXyRotation = project.settings?.allowXyRotation ?? true;
  const split = splitIntoJobs(project.parts, { gapMm, allowXyRotation });

  const jobs: Job[] = split.jobs.map((entry, index) => {
    const warnings: Warning[] = [];
    const fitsBed = entry.parts.every((part) => aabbFits(part.positionMm, part.sizeMm));
    if (!fitsBed) {
      warnings.push({
        level: "block",
        code: "job-out-of-bed",
        jobIndex: index,
        source: SPECS_PAGE,
        message: `Job ${index + 1} has a part that sits outside the official 270 mm × 270 mm × 270 mm build volume.`,
      });
    }

    const materials = uniqueMaterials(entry.parts.map((part) => part.material));
    for (const part of entry.parts) {
      warnings.push(
        ...materialWarnings(part.material, { partId: part.id, jobIndex: index }).filter(
          (warning) => warning.level !== "info",
        ),
      );
    }

    if (materials.length > 1) {
      warnings.push({
        level: "info",
        code: "mixed-materials",
        jobIndex: index,
        source: SPECS_PAGE,
        message: `Job ${index + 1} loads more than one material (${materials.join(", ")}). Official compatibility is listed by enclosure and nozzle, not by material pair. Fourload does not claim these materials are pairwise printable together.`,
      });
    }

    return {
      index,
      parts: entry.parts,
      slots: assignSlots(entry.parts),
      fitsBed,
      warnings,
    };
  });

  const warnings: Warning[] = [...settingsWarnings(project.settings)];

  if (jobs.length > 1) {
    warnings.push({
      level: "info",
      code: "split-jobs",
      message: `This plate was split into ${jobs.length} U1 jobs so that each job uses at most ${U1.toolheadsIncluded} toolhead colours. Print the jobs as separate plates. Fourload does not claim the printer can change spools mid-print.`,
    });
  }

  if (jobs.length === 1) {
    const used = Object.values(jobs[0]!.slots).filter(Boolean).length;
    warnings.push({
      level: "info",
      code: "single-job",
      message: `This plate fits in one U1 job and loads ${used} of ${U1.toolheadsIncluded} toolheads.`,
    });
  }

  return {
    projectName: project.name,
    jobs,
    blockedParts: split.blocked,
    warnings,
  };
}

function uniqueMaterials(names: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const name of names) {
    if (!name || !name.trim()) continue;
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(name.trim());
  }
  return list;
}
