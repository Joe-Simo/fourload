"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  EXAMPLE_FOUR_COLOUR,
  EXAMPLE_LIMITS,
  EXAMPLE_SIX_COLOUR,
  cloneProject,
} from "@/lib/examples";
import { planToJson, planToMarkdown } from "@/lib/export-plan";
import { parse3mf } from "@/lib/parse-3mf";
import { buildPlan } from "@/lib/plan";
import { OFFICIAL_FAQ, PRODUCT_PAGE, SPEC_NOTES, SPECS_PAGE, U1 } from "@/lib/specs";
import type { Color, Part, Plan, Project, ProjectSettings } from "@/lib/types";
import { TOOL_SLOTS } from "@/lib/types";

const SAMPLES: Array<{ id: string; label: string; project: Project }> = [
  { id: "four", label: "Sample: four colours, one job", project: EXAMPLE_FOUR_COLOUR },
  { id: "six", label: "Sample: six colours, two jobs", project: EXAMPLE_SIX_COLOUR },
  { id: "limits", label: "Sample: limits and blocked parts", project: EXAMPLE_LIMITS },
];

function newId(): string {
  return `p-${Math.random().toString(36).slice(2, 9)}`;
}

const EMPTY: Project = {
  name: "Untitled plate",
  settings: { gapMm: 2, allowXyRotation: true },
  parts: [],
};

export function Planner() {
  const [project, setProject] = useState<Project>(() => cloneProject(EXAMPLE_SIX_COLOUR));
  const [jobIndex, setJobIndex] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sample = SAMPLES.find((item) => item.id === params.get("sample"));
    if (sample) setProject(cloneProject(sample.project));
    const job = Number(params.get("job") ?? "");
    if (Number.isInteger(job) && job >= 1) setJobIndex(job - 1);
  }, []);
  const [importNotes, setImportNotes] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    x: "40",
    y: "40",
    z: "12",
    hex: "#C12E1F",
    colorName: "Red",
    material: "PLA",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const plan: Plan = useMemo(() => buildPlan(project), [project]);
  const job = plan.jobs[Math.min(jobIndex, Math.max(0, plan.jobs.length - 1))];

  function loadProject(next: Project, notes: string[] = []) {
    setProject(next);
    setJobIndex(0);
    setImportNotes(notes);
  }

  async function on3mf(file: File) {
    const buffer = await file.arrayBuffer();
    try {
      const parsed = await parse3mf(buffer);
      loadProject(
        { ...parsed.project, name: file.name.replace(/\.3mf$/i, ""), settings: project.settings },
        parsed.warnings,
      );
    } catch (error) {
      setImportNotes([error instanceof Error ? error.message : "Could not read that 3MF file."]);
    }
  }

  async function onJson(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { project?: Project } & Partial<Project>;
      const next = (data.project ?? data) as Project;
      if (!next || !Array.isArray(next.parts)) throw new Error("This JSON is not a Fourload plan.");
      loadProject({
        name: next.name || file.name,
        parts: next.parts,
        settings: { ...project.settings, ...next.settings },
      });
    } catch (error) {
      setImportNotes([error instanceof Error ? error.message : "Could not read that JSON file."]);
    }
  }

  function addPart() {
    const x = Number(form.x);
    const y = Number(form.y);
    const z = Number(form.z);
    if (!form.name.trim() || [x, y, z].some((n) => Number.isNaN(n))) return;
    const color: Color = {
      id: newId(),
      name: form.colorName.trim() || form.hex,
      hex: form.hex,
    };
    const part: Part = {
      id: newId(),
      name: form.name.trim(),
      sizeMm: [x, y, z],
      colors: [color],
      material: form.material.trim() || undefined,
    };
    setProject((current) => ({ ...current, parts: [...current.parts, part] }));
    setForm((current) => ({ ...current, name: "" }));
  }

  function removePart(id: string) {
    setProject((current) => ({
      ...current,
      parts: current.parts.filter((part) => part.id !== id),
    }));
  }

  function patchSettings(patch: Partial<ProjectSettings>) {
    setProject((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  }

  function download(filename: string, text: string, type: string) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const usedSlots = job ? Object.values(job.slots).filter(Boolean).length : 0;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>Fourload</h1>
          <p>
            Plan Snapmaker U1 print jobs that fit four toolheads. Drop a 3MF or build a
            plate, preview it on the official 270 mm bed, and split the work when a
            plate needs more than four colours. Every machine limit is cited from
            official Snapmaker pages. This is a planner, not a slicer, and it has
            not been run on a physical U1.
          </p>
        </div>
        <div className="toolbar">
          <label className="file-btn">
            Open 3MF
            <input
              ref={fileRef}
              type="file"
              accept=".3mf,application/vnd.ms-package.3dmanufacturing-3dmodel+xml"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void on3mf(file);
                event.target.value = "";
              }}
            />
          </label>
          <label className="file-btn">
            Open JSON
            <input
              ref={jsonRef}
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onJson(file);
                event.target.value = "";
              }}
            />
          </label>
          <select
            className="btn"
            defaultValue=""
            onChange={(event) => {
              const sample = SAMPLES.find((item) => item.id === event.target.value);
              if (sample) loadProject(cloneProject(sample.project));
              event.target.value = "";
            }}
          >
            <option value="" disabled>
              Load a sample
            </option>
            {SAMPLES.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.label}
              </option>
            ))}
          </select>
          <button
            className="btn"
            type="button"
            onClick={() =>
              download(
                `${slug(project.name)}.fourload.json`,
                planToJson(project, plan),
                "application/json",
              )
            }
          >
            Export JSON
          </button>
          <button
            className="btn primary"
            type="button"
            onClick={() =>
              download(`${slug(project.name)}.md`, planToMarkdown(plan), "text/markdown")
            }
          >
            Export loadout card
          </button>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>Plate</h2>
          <label className="wide" style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Plate name</span>
            <input
              value={project.name}
              onChange={(event) => setProject((current) => ({ ...current, name: event.target.value }))}
              style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 8px" }}
            />
          </label>
          <div className="part-list">
            {project.parts.length === 0 ? (
              <div className="empty">Add a part, or open a 3MF or a sample plate.</div>
            ) : (
              project.parts.map((part) => (
                <article className="part-card" key={part.id}>
                  <header>
                    <strong>{part.name}</strong>
                    <button className="danger" type="button" onClick={() => removePart(part.id)}>
                      Remove
                    </button>
                  </header>
                  <div className="part-meta">
                    {part.sizeMm[0]} × {part.sizeMm[1]} × {part.sizeMm[2]} mm
                    {part.material ? ` · ${part.material}` : ""}
                    {part.positionMm
                      ? ` · placed at ${part.positionMm.map((n) => n).join(", ")}`
                      : " · auto packed"}
                  </div>
                  <div className="swatches">
                    {part.colors.map((color) => (
                      <i
                        key={color.id}
                        className="swatch"
                        title={`${color.name} ${color.hex}`}
                        style={{ background: color.hex }}
                      />
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="form">
            <label className="wide">
              New part name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Housing"
              />
            </label>
            <label>
              X mm
              <input value={form.x} onChange={(event) => setForm({ ...form, x: event.target.value })} />
            </label>
            <label>
              Y mm
              <input value={form.y} onChange={(event) => setForm({ ...form, y: event.target.value })} />
            </label>
            <label>
              Z mm
              <input value={form.z} onChange={(event) => setForm({ ...form, z: event.target.value })} />
            </label>
            <label>
              Material
              <input
                value={form.material}
                onChange={(event) => setForm({ ...form, material: event.target.value })}
                placeholder="PLA"
              />
            </label>
            <label>
              Colour name
              <input
                value={form.colorName}
                onChange={(event) => setForm({ ...form, colorName: event.target.value })}
              />
            </label>
            <label>
              Colour
              <input
                type="color"
                value={form.hex}
                onChange={(event) => setForm({ ...form, hex: event.target.value.toUpperCase() })}
              />
            </label>
            <button className="btn primary wide" type="button" onClick={addPart}>
              Add part
            </button>
          </div>

          <h2 style={{ marginTop: 20 }}>Optional settings</h2>
          <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 0 }}>
            Leave a field blank if you do not want a check. Layout gap is a planner
            spacing, not an official clearance.
          </p>
          <div className="form settings">
            <label>
              Layout gap mm
              <input
                value={project.settings?.gapMm ?? 2}
                onChange={(event) => patchSettings({ gapMm: Number(event.target.value) || 0 })}
              />
            </label>
            <label>
              Nozzle °C
              <input
                value={project.settings?.nozzleTempC ?? ""}
                onChange={(event) =>
                  patchSettings({
                    nozzleTempC: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Bed °C
              <input
                value={project.settings?.bedTempC ?? ""}
                onChange={(event) =>
                  patchSettings({
                    bedTempC: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Speed mm/s
              <input
                value={project.settings?.speedMmS ?? ""}
                onChange={(event) =>
                  patchSettings({
                    speedMmS: event.target.value === "" ? undefined : Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
        </section>

        <section className="panel bed-wrap">
          <h2>Bed preview · {U1.buildVolumeMm[0]} × {U1.buildVolumeMm[1]} × {U1.buildVolumeMm[2]} mm official volume</h2>
          {plan.jobs.length > 0 ? (
            <div className="tabs">
              {plan.jobs.map((item) => (
                <button
                  key={item.index}
                  className={`tab ${item.index === job?.index ? "active" : ""}`}
                  type="button"
                  onClick={() => setJobIndex(item.index)}
                >
                  Job {item.index + 1} · {Object.values(item.slots).filter(Boolean).length} colours
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">Nothing to place on the bed yet.</div>
          )}

          {job ? (
            <>
              <div className="bed-frame">
                <div className="bed-label">
                  <span>Origin at the front left, units in mm</span>
                  <span>
                    Job {job.index + 1} of {plan.jobs.length} · {usedSlots} of {U1.toolheadsIncluded} toolheads ·{" "}
                    {job.fitsBed ? "fits the official volume" : "does not fit"}
                  </span>
                </div>
                <BedSvg jobParts={job.parts} />
              </div>
              <div className="legend">
                {job.parts.map((part) => (
                  <span key={part.id}>
                    <i style={{ background: part.colors[0]?.hex ?? "#888" }} />
                    {part.name}
                    {part.sizeMm[2] ? ` · ${part.sizeMm[2]} mm tall` : ""}
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {importNotes.length > 0 ? (
            <div className="notes">
              {importNotes.map((note) => (
                <div className="note warn" key={note}>
                  <b>Import</b>
                  {note}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Loadout</h2>
          {job ? (
            <table className="slots">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Colour</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {TOOL_SLOTS.map((slot) => {
                  const color = job.slots[slot];
                  return (
                    <tr key={slot}>
                      <td>{slot}</td>
                      <td>{color ? color.name : "Empty"}</td>
                      <td>
                        {color ? (
                          <i className="swatch" style={{ background: color.hex, display: "inline-block" }} />
                        ) : null}{" "}
                        {color ? color.hex : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty">No job to load.</div>
          )}

          <h2 style={{ marginTop: 20 }}>Notes</h2>
          <div className="notes">
            {plan.blockedParts.map((blocked) =>
              blocked.reasons.map((reason) => (
                <div className="note block" key={`${blocked.part.id}-${reason.code}`}>
                  <b>Blocked · {blocked.part.name}</b>
                  {reason.message}
                </div>
              )),
            )}
            {plan.warnings.map((warning) => (
              <div className={`note ${warning.level}`} key={`${warning.code}-${warning.message}`}>
                <b>{warning.level}</b>
                {warning.message}
              </div>
            ))}
            {job?.warnings.map((warning) => (
              <div className={`note ${warning.level}`} key={`job-${warning.code}-${warning.message}`}>
                <b>{warning.level}</b>
                {warning.message}
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 20 }}>Official sources</h2>
          <div className="sources">
            <p>
              <a href={SPECS_PAGE.url} target="_blank" rel="noreferrer">
                {SPECS_PAGE.label}
              </a>
              : four toolheads, 270 mm build volume, 0.4 mm nozzle, 1.75 mm filament, 300°C
              nozzle max, 100°C bed max, 500 mm/s, 20,000 mm/s², 32 mm³/s max flow, and
              the published material lists.
            </p>
            <p>
              <a href={OFFICIAL_FAQ.url} target="_blank" rel="noreferrer">
                {OFFICIAL_FAQ.label}
              </a>
              : usable bed 270 mm × 270 mm, and four 0.4 mm stainless hotends plus a spare.
            </p>
            <p>
              <a href={PRODUCT_PAGE.url} target="_blank" rel="noreferrer">
                {PRODUCT_PAGE.label}
              </a>
              : {SPEC_NOTES.swapTime.text}
            </p>
          </div>
        </section>
      </div>

      <footer className="footer">
        Fourload is an independent project and is not affiliated with Snapmaker. It was
        built with AI coding assistance. Every U1 number in the planner is taken from
        the cited official pages. No specification was invented. The job-split and
        packing logic is original to this project and is covered by tests. Open source
        under the MIT License.
      </footer>
    </div>
  );
}

function BedSvg({
  jobParts,
}: {
  jobParts: Array<{
    id: string;
    name: string;
    positionMm: [number, number, number];
    sizeMm: [number, number, number];
    colors: Color[];
  }>;
}) {
  const size = U1.buildVolumeMm[0];
  return (
    <svg
      className="bed-svg"
      viewBox={`-8 -8 ${size + 32} ${size + 32}`}
      role="img"
      aria-label="Top view of the official 270 millimetre square bed"
    >
      <rect x="0" y="0" width={size} height={size} fill="#12131a" stroke="#3a3e4a" strokeWidth="1" />
      {Array.from({ length: 10 }, (_, i) => (i + 1) * 27).map((tick) => (
        <g key={tick}>
          <line x1={tick} y1={0} x2={tick} y2={size} stroke="rgba(255,255,255,0.04)" />
          <line x1={0} y1={tick} x2={size} y2={tick} stroke="rgba(255,255,255,0.04)" />
        </g>
      ))}
      {jobParts.map((part) => {
        const [x, y] = part.positionMm;
        const [w, d] = part.sizeMm;
        const fill = part.colors[0]?.hex ?? "#666";
        // SVG Y grows down. Map bed Y so the origin sits at the bottom left.
        const svgY = size - y - d;
        return (
          <g key={part.id}>
            <rect
              className="part-box"
              x={x}
              y={svgY}
              width={w}
              height={d}
              fill={fill}
              fillOpacity={0.88}
              rx={2}
            />
            <text className="part-label" x={x + 3} y={svgY + Math.min(10, d - 2)}>
              {part.name}
            </text>
          </g>
        );
      })}
      <text fill="#6e6a62" fontSize="8" x="0" y={size + 12}>
        0
      </text>
      <text fill="#6e6a62" fontSize="8" x={size - 16} y={size + 12}>
        270 X
      </text>
      <text fill="#6e6a62" fontSize="8" x={size + 4} y={8}>
        270 Y
      </text>
    </svg>
  );
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fourload-plan";
}
