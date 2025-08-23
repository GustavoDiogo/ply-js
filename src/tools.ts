import fs from 'fs';
import path from 'path';
import { readPlyFromLines, readPly } from './api';
import { PlyData } from './data';
import type { PlyElement } from './element';
import { computeHeight, computeAABB, computeCentroid, computePCA } from './measurements';

// helpers
function linesFromUtf8(buf: Buffer) { return buf.toString('utf8').split(/\r?\n/); }

export async function extractDir(samplesDir: string, outDir: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(samplesDir).filter(f=>f.toLowerCase().endsWith('.ply'));
  for (const file of files) {
    const src = path.join(samplesDir, file);
    const summary: any = { filename: file, size: fs.statSync(src).size, format: null, header: {}, counts:{}, aabb:null, centroid:null, pca:null, warnings:[] };
    try {
      const raw = fs.readFileSync(src);
      // try ASCII first (fast)
      try {
        const lines = linesFromUtf8(raw);
        const ply = readPlyFromLines(lines);
        summary.format = 'ascii';
        // extract header comments/obj_info (parser stored on PlyData)
        summary.header.comments = ply.comments;
        summary.header.obj_info = ply.objInfo;
        // vertex positions
        const v = ply.elements.find(e=>e.name==='vertex') as PlyElement|null;
        if (!v) throw new Error('no vertex element');
        const pts: number[][] = v.data.map((r:any) => [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]]).filter((p: number[]) => p.every((n: any) => typeof n === 'number'));
        summary.counts.vertices = pts.length;
        summary.aabb = computeAABB(pts);
        summary.centroid = computeCentroid(pts);
        summary.pca = computePCA(pts);
        // faces presence
        const fe = ply.elements.find(e=>e.name==='face' || e.name==='polygon');
        summary.counts.faces = fe ? fe.data.length : 0;
      } catch (e) {
        // fallback to binary path using PlyData.read
        const ply = (PlyData as any).read(src);
        summary.format = ply.text ? 'ascii' : 'binary';
        summary.header = { comments: ply.comments, obj_info: ply.objInfo };
        const v = ply.elements.find((e:any)=>e.name==='vertex');
        if (!v) throw new Error('no vertex element');
        const pts: number[][] = v.data.map((r:any) => [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]]).filter((p: number[]) => p.every((n: any) => typeof n === 'number'));
        summary.counts.vertices = pts.length;
        summary.aabb = computeAABB(pts);
        summary.centroid = computeCentroid(pts);
        summary.pca = computePCA(pts);
        const fe = ply.elements.find((e:any)=>e.name==='face' || e.name==='polygon');
        summary.counts.faces = fe ? fe.data.length : 0;
      }
    } catch (err) {
      summary.warnings.push(String(err));
    }
    fs.writeFileSync(path.join(outDir, file + '.json'), JSON.stringify(summary, null, 2));
  }
}

// CLI
if (require.main === module) {
  const samples = process.argv[2] || path.join(__dirname, '..', '..', 'samples');
  const out = process.argv[3] || path.join(process.cwd(), 'metadata');
  extractDir(samples, out).then(()=>console.log('done')).catch(err=>{ console.error(err); process.exit(1); });
}