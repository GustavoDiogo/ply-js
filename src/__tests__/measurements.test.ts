// Consolidated measurements tests (merged extras)
import { computeAABB } from '../measurements/aabb';
import { computeCentroid } from '../measurements/centroid';
import { computeHeight } from '../measurements/height';
const vol = require('../../dist/measurements/volume.js');
import { computeCrossSectionArea, computeCrossSectionCircumference, computeCrossSectionAreaMesh } from '../measurements/crossSection';
import { computePCA, canonicalizePoints, alignPointsToPCA } from '../measurements/pca';
import { computeVolumeFromFaces } from '../measurements/volume';
import * as calibration from '../calibration';
import * as fs from 'fs';
import * as path from 'path';

describe('measurements (consolidated)', () => {
  test('AABB computes correct min/max/size', () => {
    const pts = [[0,0,0],[1,2,3],[-1,0,2]];
    const aabb = computeAABB(pts);
    expect(aabb.min).toEqual([-1,0,0]);
    expect(aabb.max).toEqual([1,2,3]);
    expect(aabb.size).toEqual([2,2,3]);
  });

  test('Centroid computes mean point', () => {
    const pts = [[0,0,0],[2,0,0]];
    const c = computeCentroid(pts);
    expect(c).toEqual([1,0,0]);
  });

  test('PCA-based height on vertical points', () => {
    const pts = [[0,0,0],[0,1,0],[0,2,0]];
    const h = computeHeight(pts);
    expect(h).toBeGreaterThan(1.9);
    expect(h).toBeLessThan(2.1);
  });

  const cubePts = [
    [0,0,0],[1,0,0],[1,1,0],[0,1,0],
    [0,0,1],[1,0,1],[1,1,1],[0,1,1]
  ];
  const quadFaces = [ [0,1,2,3], [4,7,6,5], [0,4,5,1], [1,5,6,2], [2,6,7,3], [3,7,4,0] ];

  test('Volume from triangles approximates unit cube', () => {
    const tris = [
      [0,1,2],[0,2,3],
      [4,6,5],[4,7,6],
      [0,4,5],[0,5,1],
      [1,5,6],[1,6,2],
      [2,6,7],[2,7,3],
      [3,7,4],[3,4,0]
    ];
    const v = vol.computeVolumeFromTriangles(cubePts, tris as any);
    expect(v).toBeGreaterThan(0.99);
    expect(v).toBeLessThan(1.01);
    const m = vol.estimateMassFromVolume(v, 1000);
    expect(m).toBeGreaterThan(999);
    expect(m).toBeLessThan(1001);
  });

  test('computeVolumeFromFaces accepts different face record shapes', () => {
    const volA = vol.computeVolumeFromFaces(cubePts, quadFaces as any);
    expect(volA).toBeGreaterThan(0.99);
    expect(volA).toBeLessThan(1.01);

    const facesB = quadFaces.map(f => ({ vertex_indices: f }));
    const volB = vol.computeVolumeFromFaces(cubePts, facesB as any);
    expect(volB).toBeGreaterThan(0.99);
    expect(volB).toBeLessThan(1.01);

    const facesC = quadFaces.map(f => ({ vertex_index: f }));
    const volC = vol.computeVolumeFromFaces(cubePts, facesC as any);
    expect(volC).toBeGreaterThan(0.99);
    expect(volC).toBeLessThan(1.01);
  });

  test('computeVolumeRobust handles mixed triangle orientations', () => {
    const tris = [
      [0,1,2],[0,2,3],
      [4,6,5],[4,7,6],
      [0,4,5],[0,5,1],
      [1,5,6],[1,6,2],
      [2,6,7],[2,7,3],
      [3,0,4]
    ];
    const volV = vol.computeVolumeRobust(cubePts, tris as any);
    expect(volV).toBeGreaterThan(0.9);
    expect(volV).toBeLessThan(1.1);
  });

  test('computeVolumeVoxel approximates cube volume', () => {
    const volV = vol.computeVolumeVoxel(cubePts, quadFaces as any, 0.1, 20000);
    expect(volV).toBeGreaterThan(0.9);
    expect(volV).toBeLessThan(1.1);
  });

  test('computeVolumeBySlicing approximates cube volume', () => {
    const volV = vol.computeVolumeBySlicing(cubePts, quadFaces as any, 60);
    expect(volV).toBeGreaterThan(0.9);
    expect(volV).toBeLessThan(1.1);
  });

  test('estimateMass applies calibration scale and density', () => {
    const cal = { scale: 2, densityKgPerM3: 1000 } as any;
    const res = vol.estimateMass(cubePts, quadFaces as any, { calibration: cal } as any);
    expect(res.mass).toBeGreaterThan(7900);
    expect(res.mass).toBeLessThan(8100);
  });

  test('avatar BMI path uses computeHeight', () => {
    const pts = [[0,0,0],[0,1,0],[0,2,0]];
    const h = computeHeight(pts);
    expect(h).toBeGreaterThan(1.9);
    const r = vol.estimateMass(pts as any, null as any, { objectType: 'avatar', bmi: 25 } as any);
    expect(r.method).toBe('avatar-bmi');
    expect(r.mass).toBeGreaterThan(90);
    expect(r.mass).toBeLessThan(110);
  });

  // ---- Explicit extra tests merged in ----
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
    const aligned = alignPointsToPCA(pts as any);
    expect(aligned.aligned.length).toBe(4);
    const canon = canonicalizePoints(pts as any, { scaleToUnitHeight: true } as any);
    // scaled points height should be ~1
    let minY = Infinity, maxY = -Infinity;
    for (const p of canon.points) { if (p[1]<minY) minY=p[1]; if (p[1]>maxY) maxY=p[1]; }
    expect(maxY - minY).toBeGreaterThan(0.9);
    expect(maxY - minY).toBeLessThan(1.1);
  });

  test('mm->m heuristic applied in height and volume', () => {
    // points representing 2 meters but offered in millimeters (2000 mm)
    const ptsMm = [[0,0,0],[0,1000,0],[0,2000,0]];
    const h = computeHeight(ptsMm as any);
    // computeHeight should scale mm->m and return ~2
    expect(h).toBeGreaterThan(1.9);
    expect(h).toBeLessThan(2.1);
    // volume from faces with mm coords: build cube 1000mm = 1m side
    const ptsCubeMm = [
      [0,0,0],[1000,0,0],[1000,1000,0],[0,1000,0],
      [0,0,1000],[1000,0,1000],[1000,1000,1000],[0,1000,1000]
    ];
    const faces = [ [0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0] ];
    const volv = computeVolumeFromFaces(ptsCubeMm as any, faces as any);
    expect(volv).toBeGreaterThan(0.9);
    expect(volv).toBeLessThan(1.1);
  });

  test('calibration persistence and averaging', async () => {
    const folder = path.resolve(process.cwd(), 'calibrations_test');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    const s1 = { file: path.resolve(__dirname, 'fixtures/box_mesh.json'), height: 1, mass: 1, machine: 'm1' } as any;
    const s2 = { file: path.resolve(__dirname, 'fixtures/box_mesh.json'), height: 2, mass: 8, machine: 'm1' } as any;
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
