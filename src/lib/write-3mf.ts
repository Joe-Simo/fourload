import JSZip from "jszip";
import type { Color } from "./types";

export type BoxSpec = {
  name: string;
  sizeMm: [number, number, number];
  positionMm?: [number, number, number];
  color?: Color;
};

/** Build a minimal 3MF of axis-aligned boxes, for tests and sample files. */
export async function writeBoxes3mf(boxes: BoxSpec[], unit = "millimeter"): Promise<Uint8Array> {
  const resources: string[] = [];
  const objects: string[] = [];
  const items: string[] = [];

  resources.push(`    <basematerials id="1">`);
  boxes.forEach((box, index) => {
    const hex = box.color?.hex ?? "#888888";
    const name = box.color?.name ?? `Colour ${index + 1}`;
    resources.push(`      <base name="${esc(name)}" displaycolor="${hex}FF"/>`);
  });
  resources.push(`    </basematerials>`);

  boxes.forEach((box, index) => {
    const [sx, sy, sz] = box.sizeMm;
    const verts = [
      [0, 0, 0],
      [sx, 0, 0],
      [sx, sy, 0],
      [0, sy, 0],
      [0, 0, sz],
      [sx, 0, sz],
      [sx, sy, sz],
      [0, sy, sz],
    ];
    const tris = [
      [0, 1, 2],
      [0, 2, 3],
      [4, 6, 5],
      [4, 7, 6],
      [0, 4, 5],
      [0, 5, 1],
      [1, 5, 6],
      [1, 6, 2],
      [2, 6, 7],
      [2, 7, 3],
      [3, 7, 4],
      [3, 4, 0],
    ];
    const vertexXml = verts.map((v) => `        <vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join("\n");
    const triXml = tris.map((t) => `        <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`).join("\n");
    const objectId = index + 2;
    objects.push(
      `    <object id="${objectId}" name="${esc(box.name)}" type="model" pid="1" pindex="${index}">\n      <mesh>\n        <vertices>\n${vertexXml}\n        </vertices>\n        <triangles>\n${triXml}\n        </triangles>\n      </mesh>\n    </object>`,
    );
    const [tx, ty, tz] = box.positionMm ?? [0, 0, 0];
    items.push(
      `    <item objectid="${objectId}" transform="1 0 0 0 1 0 0 0 1 ${tx} ${ty} ${tz}"/>`,
    );
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="${unit}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
${resources.join("\n")}
${objects.join("\n")}
  </resources>
  <build>
${items.join("\n")}
  </build>
</model>
`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>\n`,
  );
  zip.file("3D/3dmodel.model", xml);
  return zip.generateAsync({ type: "uint8array" });
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
