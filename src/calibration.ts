import * as path from 'path';
import * as fs from 'fs';

type LabeledSample = { file: string; height: number; mass: number; machine?: string };

// Compute calibrations (scale and density) per machine given labeled samples.
// `lib` should be the library exports (so we can call computeHeight/computeVolumeFromFaces).
export async function calibrateSamples(samples: LabeledSample[], lib: any): Promise<Record<string, { scale: number; densityKgPerM3: number; count: number }>> {
  const byMachine = new Map<string, { scales: number[]; densities: number[] }>();
  for (const s of samples) {
    const file = path.resolve(s.file);
    if (!fs.existsSync(file)) continue;
    const ply = await lib.PlyData.read(file);
    const vertex = ply.elements.find((e:any)=>e.name==='vertex');
    const face = ply.elements.find((e:any)=>e.name==='face');
    const pts = vertex.data.map((r:any)=> Array.isArray(r)? r.slice(0,3) : [r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]] ).filter((p:any)=>p.every((n:any)=>typeof n==='number'));
    const faces = face ? face.data : null;
    // measured height and geometric volume
    const measuredH = lib.computeHeight(pts);
    const geomVol = (faces && faces.length) ? lib.computeVolumeFromFaces(pts, faces) : lib.computeVolumeVoxel(pts, faces, 0.01, 500000);
    if (!measuredH || !geomVol) continue;
    const scale = s.height / measuredH;
    const scaledVol = geomVol * Math.pow(scale, 3);
    const density = s.mass / scaledVol;
    const machine = s.machine || 'default';
    let rec = byMachine.get(machine);
    if (!rec) { rec = { scales: [], densities: [] }; byMachine.set(machine, rec); }
    rec.scales.push(scale);
    rec.densities.push(density);
  }
  const out: Record<string, { scale: number; densityKgPerM3: number; count: number }> = {};
  for (const [m, rec] of byMachine.entries()) {
    const avgScale = rec.scales.reduce((a,b)=>a+b,0) / rec.scales.length;
    const avgDensity = rec.densities.reduce((a,b)=>a+b,0) / rec.densities.length;
    out[m] = { scale: avgScale, densityKgPerM3: avgDensity, count: rec.scales.length };
  }
  return out;
}

export function saveCalibrationFile(id: string, data: any, folder = path.resolve(process.cwd(), 'calibrations')) {
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

export function loadCalibrationFile(id: string, folder = path.resolve(process.cwd(), 'calibrations')): any | null {
  const file = path.join(folder, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}
