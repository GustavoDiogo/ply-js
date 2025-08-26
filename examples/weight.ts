#!/usr/bin/env node
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

function loadLib() {
  const srcTs = path.resolve(__dirname, '..', 'src', 'index.ts');
  const srcJs = path.resolve(__dirname, '..', 'src', 'index.js');
  const dist = path.resolve(__dirname, '..', 'dist', 'index.js');
  try { if (fs.existsSync(srcTs)) return require(srcTs); } catch (e) {}
  try { if (fs.existsSync(srcJs)) return require(srcJs); } catch (e) {}
  try { if (fs.existsSync(dist)) return require(dist); } catch (e) {}
  return require('..');
}

const lib = loadLib();

async function main() {
  // parse CLI args: first non-flag arg is sample path; flags like --full or -f enable full parse
  const argv = process.argv.slice(2);
  const full = argv.includes('--full') || argv.includes('-f');
  // robustly find the first non-flag argument that is not a value for a known flag
  let sampleArg: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full' || a === '-f') continue;
    if (a === '--density' || a === '-d') { i++; continue; }
    if (a.startsWith('--density=')) continue;
    if (a === '--target-mass' || a === '-t') { i++; continue; }
    if (a.startsWith('--target-mass=')) continue;
  if (a === '--object-type' || a === '-o') { i++; continue; }
  if (a.startsWith('--object-type=')) continue;
  if (a === '--bmi') { i++; continue; }
  if (a.startsWith('--bmi=')) continue;
    if (!a.startsWith('-') && sampleArg === null) sampleArg = a;
  }
  const sample = sampleArg || path.resolve(__dirname, '..', 'samples', 'man.ply');
  if (!fs.existsSync(sample)) { console.error('Sample file not found:', sample); return; }
  // header-only parse to detect binary vs ascii
  const buf = fs.readFileSync(sample);
  const reader = (() => { let off = 0; return { read(n:number){ if (off>=buf.length) return null; const end=Math.min(off+n,buf.length); const c=buf.slice(off,end); off=end; return c;} }; })();
  const lines: string[] = [];
  try { for (const l of new lib.PlyHeaderLines(reader)) lines.push(l); } catch (err) { console.error('header parse failed:', err); return; }
  const header = new lib.PlyHeaderParser(lines);
  // For binary files avoid heavy parse unless user requests full parsing.
  if (header.format !== 'ascii' && !full) { console.log('Binary PLY: mass estimate requires full parse — pass --full to enable.'); return; }
  let ply: any;
  try {
    ply = await lib.PlyData.read(sample);
  } catch (err: any) {
    console.error('Full parse failed:', err && err.message ? err.message : err);
    try {
      const fullBuf = fs.readFileSync(sample);
      const idx = fullBuf.indexOf(Buffer.from('end_header'));
      const headerEnd = idx !== -1 ? idx + 'end_header'.length : -1;
      console.error('header lines:\n' + lines.join('\n'));
      console.error('end_header idx:', idx, 'headerEnd:', headerEnd, 'file length:', fullBuf.length);
      const dataLen = headerEnd >= 0 ? fullBuf.length - headerEnd : -1;
      console.error('data tail length:', dataLen);
      console.error('first 64 bytes of data tail (hex):', headerEnd >= 0 ? fullBuf.slice(headerEnd, headerEnd + 64).toString('hex') : '<none>');
    } catch (e2) {
      console.error('diagnostics failed:', e2);
    }
    return;
  }
  const vertex = ply.elements.find((e:any)=>e.name==='vertex');
  if (!vertex) { console.error('no vertex element'); return; }
  const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
  // simple volume estimate if faces exist
  const face = ply.elements.find((e:any)=>e.name==='face');
  if (!face) { console.log('no face element — cannot estimate mass reliably'); return; }
  // mesh diagnostics: bbox, counts, unique edges, Euler characteristic
  (function meshDiagnostics(points:any[], faceRecords:any[]) {
    const vCount = points.length;
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
      if (p[2] < minZ) minZ = p[2]; if (p[2] > maxZ) maxZ = p[2];
    }
    // count triangles and edges
    let triCount = 0;
    const edgeSet = new Set<string>();
    for (const f of faceRecords) {
      let idxList: number[] | undefined;
      if (Array.isArray(f)) idxList = f as number[];
      else if (Array.isArray(f.vertex_indices)) idxList = f.vertex_indices;
      else if (Array.isArray(f.vertex_index)) idxList = f.vertex_index;
      else if (Array.isArray(f.indices)) idxList = f.indices;
      else if (Array.isArray(f.vertices)) idxList = f.vertices;
      if (!idxList) continue;
      if (idxList.length >= 3) triCount += idxList.length - 2; // fan triangulation count
      for (let i = 0; i < idxList.length; i++) {
        const a = idxList[i]; const b = idxList[(i+1)%idxList.length];
        const key = a<b ? `${a}-${b}` : `${b}-${a}`;
        edgeSet.add(key);
      }
    }
    const eCount = edgeSet.size;
    const euler = vCount - eCount + triCount;
    console.log('mesh diagnostics: vertices=', vCount, 'triangles=', triCount, 'edges=', eCount, 'euler=', euler);
    console.log('bbox min=', [minX,minY,minZ], 'max=', [maxX,maxY,maxZ]);
  })(pts, face.data);
  const vol = lib.computeVolumeFromFaces(pts, face.data);
  // object-type parsing: allow specific handling for known objects (e.g. avatar)
  const objTypeIdx = argv.findIndex(a => a === '--object-type' || a === '-o');
  let objectType: string | null = null;
  if (objTypeIdx !== -1) {
    const v = argv[objTypeIdx + 1];
    if (v && !v.startsWith('-')) objectType = v.toLowerCase();
  } else {
    const otEq = argv.find(a => a.startsWith('--object-type='));
    if (otEq) objectType = otEq.split('=')[1]?.toLowerCase() ?? null;
  }

  // avatar-specific: compute height and use an anthropometric estimate (BMI by default)
  let avatarHeightM: number | null = null;
  let avatarMassByHeight: number | null = null;
  // parse optional --bmi override (default 23)
  let bmi = 23;
  const bmiIdx = argv.findIndex(a => a === '--bmi');
  if (bmiIdx !== -1) {
    const v = argv[bmiIdx + 1];
    const parsed = v ? parseFloat(v) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) bmi = parsed;
  } else {
    const bmiEq = argv.find(a => a.startsWith('--bmi='));
    if (bmiEq) {
      const p = bmiEq.split('=')[1];
      const parsed = p ? parseFloat(p) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) bmi = parsed;
    }
  }
  if (objectType === 'avatar') {
    try {
      const rawH = lib.computeHeight(pts);
      // heuristic: if height appears to be in mm (rawH > 100), scale to meters
  avatarHeightM = rawH > 100 ? rawH * 0.001 : rawH;
  if (avatarHeightM !== null && avatarHeightM > 0) avatarMassByHeight = bmi * avatarHeightM * avatarHeightM;
    } catch (e) {
      // ignore and leave avatarHeightM null
    }
  }
  // parse optional density flag (kg/m^3)
  const densityArgIndex = argv.findIndex(a => a === '--density' || a === '-d');
  let density = 985;
  if (densityArgIndex !== -1) {
    const v = argv[densityArgIndex + 1];
    const parsed = v ? parseFloat(v) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) density = parsed;
  } else {
    // support --density=1234 form
    const denEq = argv.find(a => a.startsWith('--density='));
    if (denEq) {
      const parts = denEq.split('=');
      const parsed = parts.length>1 ? parseFloat(parts[1]) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) density = parsed;
    }
  }
  // support target mass auto-calibration
  const targetIdx = argv.findIndex(a => a === '--target-mass' || a === '-t');
  let targetMass: number | null = null;
  if (targetIdx !== -1) {
    const v = argv[targetIdx + 1];
    const parsed = v ? parseFloat(v) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) targetMass = parsed;
  } else {
    const tmEq = argv.find(a => a.startsWith('--target-mass='));
    if (tmEq) {
      const parts = tmEq.split('=');
      const parsed = parts.length>1 ? parseFloat(parts[1]) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) targetMass = parsed;
    }
  }
  if (targetMass !== null && vol > 0) {
    const newDensity = targetMass / vol;
    console.log('auto-calibrated density to reach', targetMass, 'kg =>', newDensity, 'kg/m^3');
    console.log('estimated mass (kg) @calibrated =', lib.estimateMassFromVolume(vol, newDensity));
  }
  // If object type is avatar prefer the anthropometric estimate as primary, but show geometric too
  if (objectType === 'avatar') {
    console.log('object-type = avatar; bmi used =', bmi);
    if (avatarHeightM !== null) console.log('avatar height (m) =', avatarHeightM);
    if (avatarMassByHeight !== null) console.log('avatar mass (kg) via BMI =', avatarMassByHeight);
  }
  console.log('volume (m^3) =', vol);
  console.log('used density (kg/m^3) =', density);
  console.log('estimated mass (kg) =', lib.estimateMassFromVolume(vol, density));
  // final suggestion: if avatar, present a final primary estimate
  if (objectType === 'avatar' && avatarMassByHeight !== null) {
    console.log('primary mass estimate (kg) =', avatarMassByHeight, '(avatar height-based)');
  }
  // convenience: density required to reach 75 kg for this model
  if (vol > 0) {
    const densFor75 = 75 / vol;
    console.log('density required for 75 kg (kg/m^3) =', densFor75);
  }
}

// Support --target-mass <kg> to auto-calibrate density and print the target mass result
// (useful for quick calibration when mesh may not be perfectly watertight).
if (require.main === module) {
  // noop: main already executed when run as script
}

main().catch(e=>console.error(e));
