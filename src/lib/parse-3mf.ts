import JSZip from "jszip";
import type { Color, Part, Project } from "./types";
import { normalizeHex } from "./color";

const MM_PER_INCH = 25.4;

export type ParsedModel = {
  project: Project;
  warnings: string[];
};

export async function parse3mf(data: ArrayBuffer | Uint8Array): Promise<ParsedModel> {
  const zip = await JSZip.loadAsync(data);
  const modelFile = findModelFile(zip);
  if (!modelFile) {
    throw new Error("This ZIP does not contain a 3D model file (.model), so it is not a readable 3MF.");
  }
  const xml = await modelFile.async("string");
  return parseModelXml(xml, modelFile.name);
}

function findModelFile(zip: JSZip): JSZip.JSZipObject | null {
  const names = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);
  const preferred = names.find((name) => /3d\/3dmodel\.model$/i.test(name));
  if (preferred) return zip.files[preferred] ?? null;
  const anyModel = names.find((name) => name.toLowerCase().endsWith(".model"));
  return anyModel ? zip.files[anyModel] ?? null : null;
}

export function parseModelXml(xml: string, sourceName = "3dmodel.model"): ParsedModel {
  const warnings: string[] = [];
  const unit = attr(firstTag(xml, "model") ?? "", "unit") ?? "millimeter";
  const scale = unitScale(unit);
  if (scale == null) {
    warnings.push(`The model unit "${unit}" in ${sourceName} is not millimeter or inch. Fourload left the numbers as written.`);
  }
  const factor = scale ?? 1;

  const materials = parseBaseMaterials(xml);
  const objects = new Map<string, { name: string; colors: Color[]; sizeMm: [number, number, number] }>();

  for (const objectTag of splitElements(xml, "object")) {
    const id = attr(objectTag, "id");
    if (!id) continue;
    const type = attr(objectTag, "type") ?? "model";
    if (type && type !== "model" && type !== "solidsupport" && type !== "support") {
      // Still allow component containers; mesh may be in a child object.
    }
    const name = attr(objectTag, "name") ?? `Object ${id}`;
    const pid = attr(objectTag, "pid");
    const pindex = attr(objectTag, "pindex");
    const colors: Color[] = [];
    if (pid && pindex != null) {
      const color = materials.get(`${pid}:${pindex}`);
      if (color) colors.push(color);
    }
    for (const triangle of splitElements(objectTag, "triangle")) {
      const p1 = attr(triangle, "p1");
      if (pid && p1 != null) {
        const color = materials.get(`${pid}:${p1}`);
        if (color && !colors.some((entry) => entry.hex === color.hex)) colors.push(color);
      }
    }
    const vertices = splitElements(objectTag, "vertex").map((tag) => {
      const x = Number(attr(tag, "x") ?? "0") * factor;
      const y = Number(attr(tag, "y") ?? "0") * factor;
      const z = Number(attr(tag, "z") ?? "0") * factor;
      return [x, y, z] as [number, number, number];
    });
    const size = vertices.length > 0 ? sizeFromVertices(vertices) : ([0, 0, 0] as [number, number, number]);
    objects.set(id, { name, colors, sizeMm: size });
  }

  const parts: Part[] = [];
  const buildXml = elementInner(xml, "build") ?? "";
  const items = splitElements(buildXml, "item");
  if (items.length === 0) {
    // Some files only list objects. Import each mesh object at the origin.
    let i = 0;
    for (const [id, object] of objects) {
      if (object.sizeMm[0] === 0 && object.sizeMm[1] === 0 && object.sizeMm[2] === 0) continue;
      parts.push(objectToPart(id, object, undefined, i));
      i += 1;
    }
    if (parts.length === 0) {
      warnings.push(`No build items and no mesh objects were found in ${sourceName}.`);
    }
  } else {
    items.forEach((item, index) => {
      const objectId = attr(item, "objectid");
      if (!objectId) return;
      const object = objects.get(objectId);
      if (!object) {
        warnings.push(`Build item refers to object ${objectId}, which was not in the model resources.`);
        return;
      }
      const transform = parseTransform(attr(item, "transform"));
      const position = transform
        ? ([transform.tx * factor, transform.ty * factor, transform.tz * factor] as [number, number, number])
        : undefined;
      // Size is computed from untransformed vertices. A rotation in the
      // transform is not applied to the AABB. The importer warns when the
      // 3x3 part is not identity.
      if (transform && !transform.isTranslationOnly) {
        warnings.push(
          `${object.name} has a 3MF transform that is not a plain translation. Fourload used the translation for position and the unrotated mesh size, so the bed preview may not match a rotated item.`,
        );
      }
      parts.push(objectToPart(objectId, object, position, index));
    });
  }

  for (const part of parts) {
    if (part.colors.length === 0) {
      warnings.push(`${part.name} has no 3MF material colour. Assign a colour in the editor before planning.`);
    }
  }

  return {
    project: {
      name: sourceName.replace(/.*\//, "").replace(/\.model$/i, ""),
      parts,
    },
    warnings,
  };
}

function objectToPart(
  id: string,
  object: { name: string; colors: Color[]; sizeMm: [number, number, number] },
  position: [number, number, number] | undefined,
  index: number,
): Part {
  return {
    id: `obj-${id}-${index}`,
    name: object.name,
    sizeMm: object.sizeMm,
    positionMm: position,
    colors:
      object.colors.length > 0
        ? object.colors
        : [],
  };
}

function parseBaseMaterials(xml: string): Map<string, Color> {
  const map = new Map<string, Color>();
  for (const group of [...splitElements(xml, "basematerials"), ...splitElements(xml, "colorgroup")]) {
    const id = attr(group, "id");
    if (!id) continue;
    const children = [...splitElements(group, "base"), ...splitElements(group, "color")];
    children.forEach((child, index) => {
      const raw = attr(child, "displaycolor") ?? attr(child, "color") ?? "";
      const hex = normalizeHex(raw.startsWith("#") && raw.length >= 7 ? raw.slice(0, 7) : raw);
      const name = attr(child, "name") ?? hex ?? `Colour ${index + 1}`;
      if (!hex) return;
      map.set(`${id}:${index}`, { id: `${id}-${index}`, name, hex });
    });
  }
  return map;
}

function sizeFromVertices(vertices: Array<[number, number, number]>): [number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const [x, y, z] of vertices) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  return [
    roundMm(maxX - minX),
    roundMm(maxY - minY),
    roundMm(maxZ - minZ),
  ];
}

function roundMm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function parseTransform(value: string | undefined): {
  tx: number;
  ty: number;
  tz: number;
  isTranslationOnly: boolean;
} | null {
  if (!value || !value.trim()) return null;
  const nums = value.trim().split(/[\s,]+/).map(Number);
  if (nums.length !== 12 || nums.some((n) => Number.isNaN(n))) return null;
  // 3MF stores a 3x4 matrix as 12 values. A translation-only transform
  // used by almost every slicer is: 1 0 0 0 1 0 0 0 1 tx ty tz
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22, tx, ty, tz] = nums as number[];
  const isTranslationOnly =
    near(m00, 1) &&
    near(m01, 0) &&
    near(m02, 0) &&
    near(m10, 0) &&
    near(m11, 1) &&
    near(m12, 0) &&
    near(m20, 0) &&
    near(m21, 0) &&
    near(m22, 1);
  return { tx, ty, tz, isTranslationOnly };
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function unitScale(unit: string): number | null {
  const n = unit.trim().toLowerCase();
  if (n === "millimeter" || n === "millimetre" || n === "mm") return 1;
  if (n === "inch" || n === "in") return MM_PER_INCH;
  if (n === "micron" || n === "um" || n === "µm") return 0.001;
  if (n === "meter" || n === "metre" || n === "m") return 1000;
  if (n === "foot" || n === "ft") return 12 * MM_PER_INCH;
  return null;
}

function firstTag(xml: string, name: string): string | null {
  const match = new RegExp(`<${name}\\b[^>]*>`, "i").exec(xml);
  return match ? match[0] : null;
}

function attr(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return match ? (match[2] ?? match[3]) : undefined;
}

function elementInner(xml: string, name: string): string | null {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(xml);
  return match ? match[1] ?? null : null;
}

function splitElements(xml: string, name: string): string[] {
  const parts: string[] = [];
  const re = new RegExp(`<${name}\\b([^>]*)/>|<${name}\\b([^>]*)>([\\s\\S]*?)</${name}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    parts.push(match[0]);
  }
  return parts;
}
