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
const lib:any = loadLib();
(async function(){
  const sample = path.resolve(__dirname, '..', 'samples', 'man.ply');
  const ply = await lib.PlyData.read(sample);
  const vertex = ply.elements.find((e:any)=>e.name==='vertex');
  const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
  let minY=Infinity, maxY=-Infinity, maxAbs=0;
  for (const p of pts) {
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
    for (const v of p) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  }
  console.log('raw minY=', minY, 'raw maxY=', maxY, 'raw extent=', (maxY-minY));
  console.log('maxAbs=', maxAbs);
  try { console.log('lib.computeHeight =>', lib.computeHeight(pts)); } catch (e) { console.error(e); }
})();
