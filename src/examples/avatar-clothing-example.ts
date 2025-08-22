import fs from 'fs';
import path from 'path';
import { readPlyFromLines, elementMap, PlyHeaderParser } from '..';

async function run() {
  const argvPath = process.argv[2];
  // Prefer explicit CLI path, otherwise look for samples in the project root (works for src and dist runs)
  const sample = argvPath || path.resolve(process.cwd(), 'samples', 'yah.ply');
  if (!fs.existsSync(sample)) {
    console.error('Sample file not found:', sample);
    process.exit(2);
  }

  const buf = fs.readFileSync(sample);
  const raw = buf.toString('ascii');
  const headerEndIdx = raw.indexOf('end_header');
  if (headerEndIdx < 0) {
    console.error('Invalid PLY: no end_header found in', sample);
    process.exit(3);
  }

  const headerText = raw.slice(0, headerEndIdx + 'end_header'.length);
  const headerLines = headerText.split(/\r?\n/);
  const parser = new PlyHeaderParser(headerLines.slice(1));

  const meta = {
    numVertices: (parser.elements.find(e => e.name === 'vertex')?.count) ?? 0,
    numFaces: (parser.elements.find(e => e.name === 'face' || e.name === 'polygon')?.count) ?? 0,
    format: parser.format,
    elements: parser.elements.map(e => e.name),
  };

  console.log('=== header metadata ===');
  console.log(meta);

  if (parser.format === 'ascii') {
    // For ASCII we can fully parse and compute bounding box and UVs
    const lines = buf.toString('utf8').split(/\r?\n/);
    const ply = readPlyFromLines(lines);
    const map = elementMap(ply);
    const vertices = map['vertex']?.data ?? [];
    const faces = map['face']?.data ?? map['polygon']?.data ?? [];
    console.log(`vertices: ${vertices.length}, faces: ${faces.length}`);

    if (vertices.length) {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const v of vertices) {
        const x = v.x ?? v[0];
        const y = v.y ?? v[1];
        const z = v.z ?? v[2];
        if (typeof x === 'number') { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
        if (typeof y === 'number') { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        if (typeof z === 'number') { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      }
      console.log('boundingBox:', { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } });
      const first = vertices[0] || {};
      const hasUV = ('u' in first) || ('v' in first) || ('s' in first) || ('t' in first);
      console.log('hasUV:', hasUV);
    }

    console.log('faces (sample):', faces.slice(0, 5));
  } else {
    console.log('Binary PLY detected — header metadata above. For full binary parsing use PlyData.read or readBinary helpers.');
  }
}

run().catch(err => { console.error(err); process.exit(1); });
