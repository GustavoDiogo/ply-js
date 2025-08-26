import { computeCrossSectionArea, computeCrossSectionCircumference, computeCrossSectionAreaMesh } from '../measurements/crossSection';
import { computePCA, canonicalizePoints, alignPointsToPCA } from '../measurements/pca';
import { computeHeight } from '../measurements/height';
import { computeVolumeFromFaces } from '../measurements/volume';
import * as calibration from '../calibration';
import * as fs from 'fs';
import * as path from 'path';

describe('measurements - extra tests', () => {
  test('cross-section area/perimeter for extruded rectangle', () => {
    // build extruded rectangle (0..2 x 0..1 in X,Z) along Y 0..1
    const pts: number[][] = [
      [0,0,0],[2,0,0],[2,0,1],[0,0,1],
      [0,1,0],[2,1,0],[2,1,1],[0,1,1]
    ];
    const faces = [ [0,1,2,3], [4,7,6,5], [0,4,5,1], [1,5,6,2], [2,6,7,3], [3,7,4,0] ];
    // area at y=0.5 should be 2*1 = 2
  const area = computeCrossSectionArea(pts, 0.5, 2.0);
    expect(area).toBeGreaterThan(1.9);
    expect(area).toBeLessThan(2.1);
  const circ = computeCrossSectionCircumference(pts, 0.5, 2.0);
    // perimeter = 2*(2+1) = 6
    expect(circ).toBeGreaterThan(5.8);
    expect(circ).toBeLessThan(6.2);
    // mesh-based cross-section should be similar
    const tris: number[][] = [];
    for (const f of faces) {
      for (let i=1;i+1<f.length;i++) tris.push([f[0], f[i], f[i+1]]);
    }
    const meshArea = computeCrossSectionAreaMesh(pts, tris, [0,1,0], 0.5);
    expect(meshArea).toBeGreaterThan(1.9);
    expect(meshArea).toBeLessThan(2.1);
  });

  test('PCA and canonicalize behavior', () => {
    // rectangle rotated 90deg around Z -> PCA dominant axis corresponds
    const pts = [[0,0,0],[0,2,0],[1,0,0],[1,2,0]]; // 1x2 rectangle
    const pca = computePCA(pts);
    expect(pca.mean.length).toBe(3);
    const aligned = alignPointsToPCA(pts);
    expect(aligned.aligned.length).toBe(4);
    const canon = canonicalizePoints(pts, { scaleToUnitHeight: true });
    // scaled points height should be ~1
    let minY = Infinity, maxY = -Infinity;
    for (const p of canon.points) { if (p[1]<minY) minY=p[1]; if (p[1]>maxY) maxY=p[1]; }
    expect(maxY - minY).toBeGreaterThan(0.9);
    expect(maxY - minY).toBeLessThan(1.1);
  });

  test('mm->m heuristic applied in height and volume', () => {
    // points representing 2 meters but offered in millimeters (2000 mm)
    const ptsMm = [[0,0,0],[0,1000,0],[0,2000,0]];
    const h = computeHeight(ptsMm);
    // computeHeight should scale mm->m and return ~2
    expect(h).toBeGreaterThan(1.9);
    expect(h).toBeLessThan(2.1);
    // volume from faces with mm coords: build cube 1000mm = 1m side
    const ptsCubeMm = [
      [0,0,0],[1000,0,0],[1000,1000,0],[0,1000,0],
      [0,0,1000],[1000,0,1000],[1000,1000,1000],[0,1000,1000]
    ];
    const faces = [ [0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0] ];
    const vol = computeVolumeFromFaces(ptsCubeMm as any, faces as any);
    expect(vol).toBeGreaterThan(0.9);
    expect(vol).toBeLessThan(1.1);
  });

  test('calibration persistence and averaging', async () => {
    const folder = path.resolve(process.cwd(), 'calibrations_test');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    const s1 = { file: path.resolve(__dirname, 'fixtures/box_mesh.json'), height: 1, mass: 1, machine: 'm1' };
    const s2 = { file: path.resolve(__dirname, 'fixtures/box_mesh.json'), height: 2, mass: 8, machine: 'm1' };
    // create a minimal fake lib exposing read and measurement functions used by calibrateSamples
    const lib: any = {
      PlyData: { read: async (p:string) => {
        const json = JSON.parse(fs.readFileSync(p,'utf8'));
        return { elements: [ { name: 'vertex', data: json.points }, { name: 'face', data: json.faces } ] };
      } },
      computeHeight: (pts:any) => {
        // use Y-range
        let min=Infinity,max=-Infinity; for (const p of pts) { if (p[1]<min) min=p[1]; if (p[1]>max) max=p[1]; } return max-min;
      },
      computeVolumeFromFaces: (pts:any, faces:any) => computeVolumeFromFaces(pts, faces)
    };
    const res = await calibration.calibrateSamples([s1, s2] as any, lib as any);
    // averaging scale/density should produce an entry for 'm1'
    expect(res.m1).toBeDefined();
    const file = calibration.saveCalibrationFile('m1_test', res.m1, folder);
    const loaded = calibration.loadCalibrationFile('m1_test', folder);
    expect(loaded).toBeTruthy();
    // cleanup
    fs.unlinkSync(file);
    fs.rmdirSync(folder);
  });
});
