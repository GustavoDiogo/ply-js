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

async function run() {
  const sample = path.resolve(__dirname, '..', 'samples', 'man.ply');
  if (!fs.existsSync(sample)) { console.error('sample not found:', sample); process.exit(1); }
  console.log('reading', sample);
  let ply: any;
  try { ply = await lib.PlyData.read(sample); } catch (err:any) { console.error('failed to parse:', err && err.message || err); process.exit(2); }

  const vertex = ply.elements.find((e:any)=>e.name==='vertex');
  const face = ply.elements.find((e:any)=>e.name==='face');
  if (!vertex) { console.error('no vertex element'); process.exit(3); }
  const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
  if (!face) { console.error('no face element — geometric estimation will be zero'); }

  console.log('points:', pts.length, 'faces:', face ? face.data.length : 0);
  // topology diagnostics: boundary edges and non-manifold edges
  if (face) {
    const edgeCount = new Map<string, number>();
    for (const f of face.data) {
      let idxList: number[] | undefined;
      if (Array.isArray(f)) idxList = f as number[];
      else if (Array.isArray(f.vertex_indices)) idxList = f.vertex_indices;
      else if (Array.isArray(f.vertex_index)) idxList = f.vertex_index;
      else if (Array.isArray(f.indices)) idxList = f.indices;
      else if (Array.isArray(f.vertices)) idxList = f.vertices;
      if (!idxList || idxList.length < 3) continue;
      for (let i = 0; i < idxList.length; i++) {
        const a = idxList[i]; const b = idxList[(i+1)%idxList.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
      }
    }
    let boundaryEdges = 0, nonManifoldEdges = 0;
    const boundaryAdj = new Map<number, number[]>();
    for (const [k, v] of edgeCount.entries()) {
      if (v === 1) {
        boundaryEdges++;
        const [sa, sb] = k.split('-').map(s=>parseInt(s,10));
        if (!boundaryAdj.has(sa)) boundaryAdj.set(sa, []);
        if (!boundaryAdj.has(sb)) boundaryAdj.set(sb, []);
        boundaryAdj.get(sa)!.push(sb);
        boundaryAdj.get(sb)!.push(sa);
      }
      if (v > 2) nonManifoldEdges++;
    }
    // count boundary loops
    let boundaryLoops = 0;
    const seen = new Set<number>();
    for (const start of boundaryAdj.keys()) {
      if (seen.has(start)) continue;
      boundaryLoops++;
      // walk the loop
      const stack = [start];
      while (stack.length) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        const neigh = boundaryAdj.get(cur) || [];
        for (const n of neigh) if (!seen.has(n)) stack.push(n);
      }
    }
    console.log('topology: boundaryEdges=', boundaryEdges, 'boundaryLoops=', boundaryLoops, 'nonManifoldEdges=', nonManifoldEdges);
  }

  // geometric (default)
  const root = (lib && (lib.default ?? null)) ? lib.default : lib;
  console.log('root keys =', Object.keys(root));
  if (root.measurements) console.log('root.measurements keys =', Object.keys(root.measurements));
  const candidates: Array<{name:string, fn?: any}> = [];
  candidates.push({ name: 'root.estimateMass', fn: root.estimateMass });
  candidates.push({ name: 'root.measurements.estimateMass', fn: root.measurements && root.measurements.estimateMass });
  try { const dme = require(path.resolve(__dirname, '..', 'dist', 'measurements')); candidates.push({ name: 'dist/measurements', fn: dme.estimateMass }); } catch (e) {}
  try { const sme = require(path.resolve(__dirname, '..', 'src', 'measurements')); candidates.push({ name: 'src/measurements', fn: sme.estimateMass }); } catch (e) {}
  try { const dvol = require(path.resolve(__dirname, '..', 'dist', 'measurements', 'volume')); candidates.push({ name: 'dist/measurements/volume', fn: dvol.estimateMass }); } catch (e) {}
  try { const svol = require(path.resolve(__dirname, '..', 'src', 'measurements', 'volume')); candidates.push({ name: 'src/measurements/volume', fn: svol.estimateMass }); } catch (e) {}
  try { const svolTs = require(path.resolve(__dirname, '..', 'src', 'measurements', 'volume.ts')); candidates.push({ name: 'src/measurements/volume.ts', fn: svolTs.estimateMass }); } catch (e) {}

  let estimateFn: any = undefined;
  for (const c of candidates) {
    if (c.fn && typeof c.fn === 'function') { estimateFn = c.fn; console.log('using', c.name); break; }
  }
  if (!estimateFn) {
    console.log('candidate list =', candidates.map(c=>c.name));
    console.error('estimateMass API not found on library');
    process.exit(4);
  }

  const geom = estimateFn(pts, face ? face.data : null, {});
  console.log('\nGeometric estimate:');
  console.log('  method =', geom.method);
  console.log('  mass  =', geom.mass, 'kg');
  console.log('  details =', geom.details);

  // avatar BMI-based
  const avatar = estimateFn(pts, face ? face.data : null, { objectType: 'avatar', bmi: 23 });
  console.log('\nAvatar (BMI) estimate:');
  console.log('  method =', avatar.method);
  console.log('  mass  =', avatar.mass, 'kg');
  console.log('  details =', avatar.details);

  // voxel method (1cm voxels)
  const voxel = estimateFn(pts, face ? face.data : null, { method: 'voxel', voxelSize: 0.01 });
  console.log('\nVoxel estimate (voxelSize=0.01m):');
  console.log('  method =', voxel.method);
  console.log('  mass  =', voxel.mass, 'kg');
  console.log('  details =', voxel.details);

  // orientation diagnostics: compute per-triangle signed tetra volumes (origin at 0)
  (function orientationDiagnostics(points: number[][], faceRecords: any[]) {
    // coord scale heuristic (same as measurements)
    let maxAbs = 0;
    for (const p of points) for (const v of p) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    const coordScale = maxAbs > 100 ? 0.001 : 1;
    const scaled = coordScale === 1 ? points : points.map(p => p.map(v => v * coordScale));

    function stv(a:number[], b:number[], c:number[]) {
      return (1.0/6.0) * (
        a[0] * (b[1]*c[2] - b[2]*c[1]) -
        a[1] * (b[0]*c[2] - b[2]*c[0]) +
        a[2] * (b[0]*c[1] - b[1]*c[0])
      );
    }

    let pos=0, neg=0, zero=0;
    let signedSum = 0, absSum = 0;
    for (const f of faceRecords) {
      let idxList: number[] | undefined;
      if (Array.isArray(f)) idxList = f as number[];
      else if (Array.isArray(f.vertex_indices)) idxList = f.vertex_indices;
      else if (Array.isArray(f.vertex_index)) idxList = f.vertex_index;
      else if (Array.isArray(f.indices)) idxList = f.indices;
      else if (Array.isArray(f.vertices)) idxList = f.vertices;
      if (!idxList) continue;
      for (let i = 1; i + 1 < idxList.length; i++) {
        const a = scaled[idxList[0]]; const b = scaled[idxList[i]]; const c = scaled[idxList[i+1]];
        if (!a||!b||!c) continue;
        const v = stv(a,b,c);
        signedSum += v; absSum += Math.abs(v);
        if (v > 0) pos++; else if (v < 0) neg++; else zero++;
      }
    }
    console.log('\nOrientation diagnostics: coordScale=', coordScale, 'triangles=', pos+neg+zero);
    console.log('  signedSum (m^3) =', signedSum, 'absSum (m^3) =', absSum);
    console.log('  positive tris=', pos, 'negative tris=', neg, 'zero=', zero);
    console.log('  cancellation ratio =', (Math.abs(signedSum) / absSum).toFixed(4));
  })(pts, face ? face.data : []);

    // Attempt to repair face winding by propagating orientation across shared edges.
    function repairFaceOrientation(faceRecords: any[]): number[][] {
      const facesArr: number[][] = [];
      for (const f of faceRecords) {
        let idxList: number[] | undefined;
        if (Array.isArray(f)) idxList = f as number[];
        else if (Array.isArray(f.vertex_indices)) idxList = f.vertex_indices;
        else if (Array.isArray(f.vertex_index)) idxList = f.vertex_index;
        else if (Array.isArray(f.indices)) idxList = f.indices;
        else if (Array.isArray(f.vertices)) idxList = f.vertices;
        if (!idxList) continue;
        facesArr.push(idxList.slice());
      }
      const edgeMap = new Map<string, {fi:number, a:number, b:number}[]>();
      for (let fi = 0; fi < facesArr.length; fi++) {
        const idx = facesArr[fi];
        for (let i = 0; i < idx.length; i++) {
          const a = idx[i], b = idx[(i+1)%idx.length];
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (!edgeMap.has(key)) edgeMap.set(key, []);
          edgeMap.get(key)!.push({ fi, a, b });
        }
      }
      const oriented = new Array(facesArr.length).fill(false);
      const flip = new Array(facesArr.length).fill(false);
      for (let start = 0; start < facesArr.length; start++) {
        if (oriented[start]) continue;
        // BFS
        const q = [start]; oriented[start] = true; flip[start] = false;
        while (q.length) {
          const cur = q.shift()!;
          const idx = facesArr[cur];
          for (let i = 0; i < idx.length; i++) {
            const a = idx[i], b = idx[(i+1)%idx.length];
            const key = a < b ? `${a}-${b}` : `${b}-${a}`;
            const entries = edgeMap.get(key) || [];
            for (const e of entries) {
              if (e.fi === cur) continue;
              if (!oriented[e.fi]) {
                const sameDir = (a === e.a && b === e.b);
                flip[e.fi] = sameDir ? !flip[cur] : flip[cur];
                oriented[e.fi] = true;
                q.push(e.fi);
              }
            }
          }
        }
      }
      const out: number[][] = [];
      for (let i = 0; i < facesArr.length; i++) {
        const f = facesArr[i];
        out.push(flip[i] ? f.slice().reverse() : f.slice());
      }
      return out;
    }

    if (face) {
      const repaired = repairFaceOrientation(face.data);
      const repairedGeom = estimateFn(pts, repaired, {});
      console.log('\nAfter repair: geometric estimate: mass=', repairedGeom.mass, 'kg details=', repairedGeom.details);
    }

  // quick experiments: try several voxel sizes and compute required density/BMI for 75kg
  const tryVoxelSizes = [0.02, 0.03, 0.05];
  console.log('\nExperiment: voxel grid sweep and calibration to 75kg');
  for (const vs of tryVoxelSizes) {
    process.stdout.write(`  voxelSize=${vs}m ... `);
    const r = estimateFn(pts, face ? face.data : null, { method: 'voxel', voxelSize: vs, maxVoxels: 5000000 });
    const mass = r.mass || 0;
    const vol = r.details && r.details.geomVol ? r.details.geomVol : (r.details && r.details.geomVol === 0 ? 0 : undefined);
    console.log(`mass=${mass.toFixed(4)} kg`);
    if (vol && vol > 0) {
      console.log(`    geomVol=${vol.toFixed(6)} m^3, density needed for 75kg=${(75/vol).toFixed(2)} kg/m^3`);
    }
  }

  // calibration helpers
  if (geom && geom.details && geom.details.geomVol) {
    const densFor75 = 75 / geom.details.geomVol;
    console.log('\nCalibration: geometric volume => density required for 75 kg =', densFor75, 'kg/m^3');
  }
  if (avatar && avatar.details && avatar.details.heightM) {
    const h = avatar.details.heightM;
    const bmiNeeded = 75 / (h * h);
    console.log('Calibration: avatar height => BMI required for 75 kg =', bmiNeeded);
  }
}

run().catch(e=>{ console.error(e); process.exit(10); });
