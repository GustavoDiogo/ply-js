#!/usr/bin/env node
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

const libPath = path.resolve(__dirname, '..', 'src', 'measurements', 'volume.ts');
const lib = require(libPath);

async function run() {
  const sample = path.resolve(__dirname, '..', 'samples', 'man.ply');
  if (!fs.existsSync(sample)) { console.error('sample not found'); process.exit(1); }
  const PlyData = require(path.resolve(__dirname, '..', 'src', 'index.ts')).PlyData;
  const ply = await PlyData.read(sample);
  const vertex = ply.elements.find((e:any)=>e.name==='vertex');
  const face = ply.elements.find((e:any)=>e.name==='face');
  const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
  console.log('Running high-res voxel test: voxelSize=0.005, maxVoxels=2000000');
  const res = lib.estimateMass(pts, face ? face.data : null, { method: 'voxel', voxelSize: 0.005, maxVoxels: 2000000 });
  console.log('result:', res);
}
run().catch(e=>{ console.error(e); process.exit(2); });
