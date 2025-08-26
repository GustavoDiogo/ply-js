#!/usr/bin/env node
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';
import type { PlyData as PlyDataType } from '..';

function loadLib() {
  const srcTs = path.resolve(__dirname, '..', 'src', 'index.ts');
  const srcJs = path.resolve(__dirname, '..', 'src', 'index.js');
  const dist = path.resolve(__dirname, '..', 'dist', 'index.js');
  try { if (fs.existsSync(srcTs)) return require(srcTs); } catch (e) {}
  try { if (fs.existsSync(srcJs)) return require(srcJs); } catch (e) {}
  try { if (fs.existsSync(dist)) return require(dist); } catch (e) {}
  return require('..');
}

const lib: any = loadLib();

// Simple example: read a PLY file (path), compute basic metrics and print
async function main() {
  // prefer an argument, else try common sample locations
  const argPath = process.argv[2];
  const candidates = [] as string[];
  if (argPath) candidates.push(argPath);
  // project-root relative samples
  candidates.push(path.resolve(__dirname, '..', 'samples', 'man.ply'));
  candidates.push(path.resolve(__dirname, '..', '..', 'samples', 'man.ply'));
  candidates.push(path.resolve(process.cwd(), 'samples', 'man.ply'));

  const samplePath = candidates.find(p => p && fs.existsSync(p));
  if (!samplePath) {
    console.error('Sample file not found. Tried:', candidates.join(', '));
    return;
  }

  // Read raw file buffer and use a small buffer-backed reader with PlyHeaderLines
  const buf = fs.readFileSync(samplePath);

  const bufferReader = (() => {
    let offset = 0;
    return {
      read(n: number) {
        if (offset >= buf.length) return null;
        const end = Math.min(offset + n, buf.length);
        const chunk = buf.slice(offset, end);
        offset = end;
        return chunk;
      }
    };
  })();

  const lines: string[] = [];
  try {
    for (const line of new lib.PlyHeaderLines(bufferReader)) lines.push(line);
  } catch (err) {
    console.error('failed to parse header:', err);
    return;
  }

  const parser = new lib.PlyHeaderParser(lines);
  console.log('=== header metadata ===');
  console.log({ numVertices: parser.elements.find((e: any) => e.name === 'vertex')?.count, numFaces: parser.elements.find((e: any) => e.name === 'face')?.count, format: parser.format, elements: parser.elements.map((e:any)=>e.name) });

  if (parser.format === 'ascii') {
    // for ASCII files it's safe to fully parse using PlyData.read
    const ply = await lib.PlyData.read(samplePath) as PlyDataType;
    const meta = lib.extractMetadata(ply);
    // Extract vertex coordinates
    const vertex = ply.elements?.find((e: any) => e.name === 'vertex');
    if (!vertex) { console.error('No vertex element found'); return; }

    const points: number[][] = [];
    for (const rec of vertex.data) {
      if (Array.isArray(rec) && rec.length >= 3) {
        const [x, y, z] = rec as number[];
        if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') points.push([x, y, z]);
      } else {
        const r: any = rec;
        const x = Array.isArray(r.x) ? r.x[0] : r.x;
        const y = Array.isArray(r.y) ? r.y[0] : r.y;
        const z = Array.isArray(r.z) ? r.z[0] : r.z;
        if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') points.push([x, y, z]);
      }
    }

    console.log('num points =', points.length);
    console.log('AABB =', lib.computeAABB(points));
    console.log('centroid =', lib.computeCentroid(points));
    console.log('height =', lib.computeHeight(points));

    const face = ply.elements?.find((e: any) => e.name === 'face');
    if (face) {
      const vol = lib.computeVolumeFromFaces(points, face.data as any[]);
      console.log('volume (m^3) =', vol);
      console.log('estimated mass (kg) =', lib.estimateMassFromVolume(vol));
    } else {
      console.log('no face element found — skipping volume');
    }
  } else {
    console.log('Binary PLY detected — header metadata above. For full binary parsing use PlyData.read or readBinary helpers (may be slower).');
  }
}

main().catch(err => { console.error(err); });
