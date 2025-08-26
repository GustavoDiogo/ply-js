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

const lib: any = loadLib();

async function main() {
  const sample = process.argv[2] || path.resolve(__dirname, '..', 'samples', 'man.ply');
  if (!fs.existsSync(sample)) { console.error('Sample file not found:', sample); return; }
  const buf = fs.readFileSync(sample);
  const reader = (() => { let off = 0; return { read(n:number){ if (off>=buf.length) return null; const end=Math.min(off+n,buf.length); const c=buf.slice(off,end); off=end; return c;} }; })();
  const lines: string[] = [];
  try { for (const l of new lib.PlyHeaderLines(reader)) lines.push(l); } catch (err) { console.error('header parse failed:', err); return; }
  const header = new lib.PlyHeaderParser(lines);
  console.log('PLY format:', header.format);
  if (header.format !== 'ascii') { console.log('Binary PLY — header only shown. Run weight/height examples for ASCII full parsing.'); return; }
  const ply = await lib.PlyData.read(sample);
  const vertex = ply.elements.find((e:any)=>e.name==='vertex');
  const face = ply.elements.find((e:any)=>e.name==='face');
  if (!vertex) { console.error('no vertex element'); return; }
  const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
  console.log('num points =', pts.length);
  console.log('height (m) =', lib.computeHeight(pts));
  if (face) {
    const vol = lib.computeVolumeFromFaces(pts, face.data);
    console.log('volume (m^3) =', vol);
    console.log('estimated mass (kg) =', lib.estimateMassFromVolume(vol));
  } else {
    console.log('no faces — volume/mass skipped');
  }
}

main().catch(e=>console.error(e));
