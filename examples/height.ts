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
  // parse CLI args: first non-flag arg is sample path; flags like --full or -f enable full parse
  const argv = process.argv.slice(2);
  const full = argv.includes('--full') || argv.includes('-f');
  const sampleArg = argv.find(a => !a.startsWith('-'));
  const sample = sampleArg || path.resolve(__dirname, '..', 'samples', 'man.ply');
  if (!fs.existsSync(sample)) { console.error('Sample file not found:', sample); return; }

  // parse header only (safe for binary)
  const buf = fs.readFileSync(sample);
  const reader = (() => { let off = 0; return { read(n:number){ if (off>=buf.length) return null; const end=Math.min(off+n,buf.length); const c=buf.slice(off,end); off=end; return c;} }; })();
  const lines: string[] = [];
  try { for (const l of new lib.PlyHeaderLines(reader)) lines.push(l); } catch (err) { console.error('header parse failed:', err); return; }
  const header = new lib.PlyHeaderParser(lines);
  console.log('format =', header.format);

  // For binary files prefer to avoid a heavy parse unless user requested it.
  if (header.format !== 'ascii' && !full) {
    console.log('Binary PLY: to compute height run a full parse (pass --full to enable).');
    return;
  }
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
  console.log('height (m) =', lib.computeHeight(pts));
}

main().catch(e=>console.error(e));
