// Consolidated measurements test suite
// Covers: AABB, centroid, PCA-based height, volume estimators (triangles/faces/robust/voxel/slicing),
// mass estimation and avatar BMI path.

const vol = require('../../dist/measurements/volume.js');
import { computeAABB } from '../measurements/aabb';
import { computeCentroid } from '../measurements/centroid';
import { computeHeight } from '../measurements/height';

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
    const cal = { scale: 2, densityKgPerM3: 1000 };
    const res = vol.estimateMass(cubePts, quadFaces as any, { calibration: cal });
    expect(res.mass).toBeGreaterThan(7900);
    expect(res.mass).toBeLessThan(8100);
  });

  test('avatar BMI path uses computeHeight', () => {
    const pts = [[0,0,0],[0,1,0],[0,2,0]];
    const h = computeHeight(pts);
    expect(h).toBeGreaterThan(1.9);
    const r = vol.estimateMass(pts, null, { objectType: 'avatar', bmi: 25 });
    expect(r.method).toBe('avatar-bmi');
    expect(r.mass).toBeGreaterThan(90);
    expect(r.mass).toBeLessThan(110);
  });
});
