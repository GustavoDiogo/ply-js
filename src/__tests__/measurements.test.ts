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

  // Additional tests for better volume.ts coverage
  test('orientTriangles handles empty and single triangle arrays', () => {
    const empty = vol.orientTriangles([]);
    expect(empty).toEqual([]);
    
    const single = vol.orientTriangles([[0, 1, 2]]);
    expect(single).toEqual([[0, 1, 2]]);
  });

  test('computeVolumeFromTriangles handles edge cases', () => {
    // Empty triangles
    const vEmpty = vol.computeVolumeFromTriangles(cubePts, []);
    expect(vEmpty).toBe(0);
    
    // Invalid triangle indices
    const vInvalid = vol.computeVolumeFromTriangles(cubePts, [[999, 1000, 1001]]);
    expect(vInvalid).toBe(0);
    
    // Degenerate triangles (same point repeated)
    const vDegenerate = vol.computeVolumeFromTriangles(cubePts, [[0, 0, 0]]);
    expect(vDegenerate).toBe(0);
  });

  test('estimateMassFromVolume handles invalid inputs', () => {
    expect(vol.estimateMassFromVolume(0)).toBe(0);
    expect(vol.estimateMassFromVolume(-1)).toBe(0);
    expect(vol.estimateMassFromVolume(NaN)).toBe(0);
    expect(vol.estimateMassFromVolume(Infinity)).toBe(0);
    
    // Valid input
    expect(vol.estimateMassFromVolume(1, 1000)).toBe(1000);
  });

  test('computeVolumeFromFaces handles various face record formats', () => {
    // Test with empty faces
    const vEmpty = vol.computeVolumeFromFaces(cubePts, []);
    expect(vEmpty).toBe(0);
    
    // Test with faces that have no valid vertex lists
    const vInvalid = vol.computeVolumeFromFaces(cubePts, [{ someProperty: 'test' }]);
    expect(vInvalid).toBe(0);
    
    // Test with different property names
    const facesIndices = quadFaces.map(f => ({ indices: f }));
    const vIndices = vol.computeVolumeFromFaces(cubePts, facesIndices);
    expect(vIndices).toBeGreaterThan(0.99);
    expect(vIndices).toBeLessThan(1.01);
    
    const facesVertices = quadFaces.map(f => ({ vertices: f }));
    const vVertices = vol.computeVolumeFromFaces(cubePts, facesVertices);
    expect(vVertices).toBeGreaterThan(0.99);
    expect(vVertices).toBeLessThan(1.01);
  });

  test('estimateMass function with various options', () => {
    // Test with no faces (should handle gracefully)
    const resultNoFaces = vol.estimateMass(cubePts, null, {});
    expect(resultNoFaces.mass).toBeGreaterThanOrEqual(0);
    expect(resultNoFaces.method).toBeDefined();
    
    // Test with empty faces
    const resultEmptyFaces = vol.estimateMass(cubePts, [], {});
    expect(resultEmptyFaces.mass).toBeGreaterThanOrEqual(0);
    
    // Test with custom density
    const resultCustomDensity = vol.estimateMass(cubePts, quadFaces, { densityKgPerM3: 500 });
    expect(resultCustomDensity.mass).toBeGreaterThan(0);
    
    // Test with geometric method
    const resultGeometric = vol.estimateMass(cubePts, quadFaces, { method: 'geometric' });
    expect(resultGeometric.mass).toBeGreaterThan(0);
    expect(resultGeometric.method).toBe('geometric');
    
    // Test with voxel method
    const resultVoxel = vol.estimateMass(cubePts, quadFaces, { 
      method: 'voxel', 
      voxelSize: 0.1,
      maxVoxels: 10000 
    });
    expect(resultVoxel.mass).toBeGreaterThan(0);
    expect(resultVoxel.method).toBe('voxel');
    
    // Test with slice method
    const resultSlice = vol.estimateMass(cubePts, quadFaces, { 
      method: 'slice',
      sliceCount: 50
    });
    expect(resultSlice.mass).toBeGreaterThan(0);
    expect(resultSlice.method).toBe('slice');
  });

  test('estimateMass with calibration options', () => {
    // Test with calibration object
    const calibrationObj = { scale: 0.5, densityKgPerM3: 2000 };
    const resultCalibration = vol.estimateMass(cubePts, quadFaces, { 
      calibration: calibrationObj 
    });
    expect(resultCalibration.mass).toBeGreaterThan(0);
    
    // Test with invalid calibration string (should not crash)
    const resultInvalidCal = vol.estimateMass(cubePts, quadFaces, { 
      calibration: 'nonexistent-machine' 
    });
    expect(resultInvalidCal.mass).toBeGreaterThan(0);
  });

  test('computeVolumeVoxel with different parameters', () => {
    // Test with larger voxel size (faster but less accurate)
    const volLarge = vol.computeVolumeVoxel(cubePts, quadFaces, 0.2, 1000);
    expect(volLarge).toBeGreaterThan(0.5);
    expect(volLarge).toBeLessThan(1.5);
    
    // Test with very small max voxels (should handle limitation)
    const volLimited = vol.computeVolumeVoxel(cubePts, quadFaces, 0.01, 10);
    expect(volLimited).toBeGreaterThan(0);
  });

  test('computeVolumeBySlicing with different slice counts', () => {
    // Test with few slices (faster but less accurate)
    const volFewSlices = vol.computeVolumeBySlicing(cubePts, quadFaces, 10);
    expect(volFewSlices).toBeGreaterThan(0.5);
    expect(volFewSlices).toBeLessThan(1.5);
    
    // Test with many slices (more accurate)
    const volManySlices = vol.computeVolumeBySlicing(cubePts, quadFaces, 1000);
    expect(volManySlices).toBeGreaterThan(0.9);
    expect(volManySlices).toBeLessThan(1.1);
  });

  test('volume functions handle degenerate geometries', () => {
    // Points that form a flat plane (no volume)
    const flatPts = [[0,0,0], [1,0,0], [0,1,0], [1,1,0]];
    const flatFaces = [[0,1,2,3]];
    
    const flatVol = vol.computeVolumeFromFaces(flatPts, flatFaces);
    expect(flatVol).toBe(0);
    
    // Single point repeated
    const singlePt = [[0,0,0], [0,0,0], [0,0,0]];
    const singleFace = [[0,1,2]];
    
    const singleVol = vol.computeVolumeFromFaces(singlePt, singleFace);
    expect(singleVol).toBe(0);
  });

});
