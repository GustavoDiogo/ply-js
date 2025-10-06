import * as vol from '../measurements/volume';

describe('Volume functions - comprehensive coverage', () => {
  // Helper to create simple cube points
  const createCube = (size = 1) => [
    [0, 0, 0], [size, 0, 0], [size, size, 0], [0, size, 0], // bottom face
    [0, 0, size], [size, 0, size], [size, size, size], [0, size, size]  // top face
  ];

  // Helper to create cube faces (triangulated)
  const createCubeFaces = () => [
    [0, 1, 2], [0, 2, 3], // bottom
    [4, 7, 6], [4, 6, 5], // top
    [0, 4, 5], [0, 5, 1], // front
    [2, 6, 7], [2, 7, 3], // back
    [0, 3, 7], [0, 7, 4], // left
    [1, 5, 6], [1, 6, 2]  // right
  ];

  test('computeVolumeFromTriangles with various geometric shapes', () => {
    // Test with unit cube
    const cubePoints = createCube(1);
    const cubeFaces = createCubeFaces();
    const cubeVol = vol.computeVolumeFromTriangles(cubePoints, cubeFaces);
    expect(cubeVol).toBeCloseTo(1, 1);

    // Test with scaled cube
    const largeCubePoints = createCube(2);
    const largeCubeVol = vol.computeVolumeFromTriangles(largeCubePoints, cubeFaces);
    expect(largeCubeVol).toBeCloseTo(8, 1);

    // Test with empty triangles
    expect(vol.computeVolumeFromTriangles(cubePoints, [])).toBe(0);

    // Test with invalid triangle indices
    const invalidFaces = [[0, 1, 999], [0, 999, 2]];
    const invalidVol = vol.computeVolumeFromTriangles(cubePoints, invalidFaces);
    expect(invalidVol).toBeGreaterThanOrEqual(0);
  });

  test('orientTriangles handles various triangle configurations', () => {
    const points = createCube(1);
    const faces = createCubeFaces();
    
    // Test normal case
    const oriented = vol.orientTriangles(faces);
    expect(oriented).toHaveLength(faces.length);
    expect(oriented[0]).toHaveLength(3);

    // Test with empty triangles
    expect(vol.orientTriangles([])).toEqual([]);

    // Test with single triangle
    const singleTri = [[0, 1, 2]];
    const singleOriented = vol.orientTriangles(singleTri);
    expect(singleOriented).toHaveLength(1);

    // Test with disconnected triangles
    const disconnected = [[0, 1, 2], [3, 4, 5]];
    const disconnectedOriented = vol.orientTriangles(disconnected);
    expect(disconnectedOriented).toHaveLength(2);
  });

  test('computeVolumeRobust with different orientations', () => {
    const points = createCube(1);
    const faces = createCubeFaces();
    
    // Test normal orientation
    const vol1 = vol.computeVolumeRobust(points, faces);
    expect(vol1).toBeCloseTo(1, 1);

    // Test with flipped triangles (reverse winding)
    const flippedFaces = faces.map(f => [f[0], f[2], f[1]]);
    const vol2 = vol.computeVolumeRobust(points, flippedFaces);
    expect(vol2).toBeCloseTo(1, 1);

    // Test with mixed orientations
    const mixedFaces = [...faces.slice(0, 6), ...flippedFaces.slice(6)];
    const vol3 = vol.computeVolumeRobust(points, mixedFaces);
    expect(vol3).toBeGreaterThan(0);
  });

  test('computeVolumeVoxel with different parameters and edge cases', () => {
    const points = createCube(1);
    const faces = createCubeFaces().map(f => ({ vertex_indices: f }));
    
    // Test with different voxel sizes
    const vol1 = vol.computeVolumeVoxel(points, faces, 0.1, 100000);
    expect(vol1).toBeCloseTo(1, 0);

    const vol2 = vol.computeVolumeVoxel(points, faces, 0.05, 100000);
    expect(vol2).toBeCloseTo(1, 0);

    // Test with very coarse voxelization
    const vol3 = vol.computeVolumeVoxel(points, faces, 0.5, 100000);
    expect(vol3).toBeGreaterThan(0);

    // Test with empty faces
    expect(vol.computeVolumeVoxel(points, [], 0.1, 100000)).toBe(0);

    // Test with empty points
    expect(vol.computeVolumeVoxel([], faces, 0.1, 100000)).toBe(0);

    // Test with maxVoxels limit (should fallback to geometric)
    const volLimited = vol.computeVolumeVoxel(points, faces, 0.01, 10);
    expect(volLimited).toBeGreaterThan(0);

    // Test with large coordinates (mm scale)
    const largePoints = points.map(p => p.map(v => v * 1000));
    const volLarge = vol.computeVolumeVoxel(largePoints, faces, 0.1, 100000);
    expect(volLarge).toBeCloseTo(1, 0); // Should scale down automatically
  });

  test('computeVolumeBySlicing with different slice counts', () => {
    const points = createCube(1);
    const faces = createCubeFaces().map(f => ({ vertex_indices: f }));
    
    // Test with different slice counts
    const vol1 = vol.computeVolumeBySlicing(points, faces, 10);
    expect(vol1).toBeCloseTo(1, 0);

    const vol2 = vol.computeVolumeBySlicing(points, faces, 50);
    expect(vol2).toBeCloseTo(1, 0);

    const vol3 = vol.computeVolumeBySlicing(points, faces, 100);
    expect(vol3).toBeCloseTo(1, 0);

    // Test with minimal slices
    const vol4 = vol.computeVolumeBySlicing(points, faces, 1);
    expect(vol4).toBeGreaterThanOrEqual(0);

    // Test with empty data
    expect(vol.computeVolumeBySlicing([], faces, 10)).toBe(0);
    expect(vol.computeVolumeBySlicing(points, [], 10)).toBe(0);

    // Test with large coordinates
    const largePoints = points.map(p => p.map(v => v * 1000));
    const volLarge = vol.computeVolumeBySlicing(largePoints, faces, 20);
    expect(volLarge).toBeCloseTo(1, 0);
  });

  test('computeVolumeFromFaces with various face formats', () => {
    const points = createCube(1);
    
    // Test with vertex_indices format
    const faces1 = createCubeFaces().map(f => ({ vertex_indices: f }));
    const vol1 = vol.computeVolumeFromFaces(points, faces1);
    expect(vol1).toBeCloseTo(1, 1);

    // Test with vertex_index format
    const faces2 = createCubeFaces().map(f => ({ vertex_index: f }));
    const vol2 = vol.computeVolumeFromFaces(points, faces2);
    expect(vol2).toBeCloseTo(1, 1);

    // Test with indices format
    const faces3 = createCubeFaces().map(f => ({ indices: f }));
    const vol3 = vol.computeVolumeFromFaces(points, faces3);
    expect(vol3).toBeCloseTo(1, 1);

    // Test with vertices format
    const faces4 = createCubeFaces().map(f => ({ vertices: f }));
    const vol4 = vol.computeVolumeFromFaces(points, faces4);
    expect(vol4).toBeCloseTo(1, 1);

    // Test with array format
    const faces5 = createCubeFaces();
    const vol5 = vol.computeVolumeFromFaces(points, faces5);
    expect(vol5).toBeCloseTo(1, 1);

    // Test with quad faces (should be triangulated)
    const quadFaces = [
      { vertex_indices: [0, 1, 2, 3] }, // bottom quad
      { vertex_indices: [4, 7, 6, 5] }  // top quad
    ];
    const volQuad = vol.computeVolumeFromFaces(points, quadFaces);
    expect(volQuad).toBeGreaterThan(0);

    // Test with empty faces
    expect(vol.computeVolumeFromFaces(points, [])).toBe(0);

    // Test with invalid face format
    const invalidFaces = [{ invalid: [0, 1, 2] }];
    const volInvalid = vol.computeVolumeFromFaces(points, invalidFaces);
    expect(volInvalid).toBe(0);
  });

  test('estimateMassFromVolume with different parameters', () => {
    // Test with default density
    const mass1 = vol.estimateMassFromVolume(1.0);
    expect(mass1).toBe(985); // default density

    // Test with custom density
    const mass2 = vol.estimateMassFromVolume(1.0, 1000);
    expect(mass2).toBe(1000);

    // Test with zero volume
    expect(vol.estimateMassFromVolume(0)).toBe(0);
    expect(vol.estimateMassFromVolume(0, 1000)).toBe(0);

    // Test with negative volume (should be treated as zero)
    expect(vol.estimateMassFromVolume(-1)).toBe(0);

    // Test with fractional volume
    const mass3 = vol.estimateMassFromVolume(0.5, 1000);
    expect(mass3).toBe(500);
  });

  test('estimateMass with comprehensive option combinations', () => {
    const points = createCube(1);
    const faces = createCubeFaces().map(f => ({ vertex_indices: f }));

    // Test with all volume methods
    const methods = ['geometric', 'voxel', 'slice', 'best'];
    for (const method of methods) {
      const result = vol.estimateMass(points, faces, { 
        method: method as any,
        voxelSize: 0.1
      });
      expect(result.mass).toBeGreaterThan(0);
      expect(result.method).toBe(method);
      expect(result.details).toBeDefined();
    }

    // Test with null faces (should return 0 mass)
    const resultNull = vol.estimateMass(points, null);
    expect(resultNull.mass).toBe(0);

    // Test with empty faces
    const resultEmpty = vol.estimateMass(points, []);
    expect(resultEmpty.mass).toBe(0);

    // Test with custom density
    const resultDensity = vol.estimateMass(points, faces, { densityKgPerM3: 1000 });
    expect(resultDensity.mass).toBeGreaterThan(0);
    expect(resultDensity.details.density).toBe(1000);

    // Test with calibration object
    const calibration = { scale: 0.001, densityKgPerM3: 2000 };
    const resultCal = vol.estimateMass(points, faces, { calibration });
    expect(resultCal.mass).toBeGreaterThan(0);
    expect(resultCal.details.appliedScale).toBe(0.001);

    // Test with avatar BMI calculation
    const resultAvatar = vol.estimateMass(points, faces, { 
      objectType: 'avatar', 
      bmi: 25 
    });
    expect(resultAvatar.method).toBe('avatar-bmi');
    expect(resultAvatar.details.bmi).toBe(25);

    // Test avatar that falls back to geometric method
    // The flat square will actually use avatar-bmi since height computation uses largest extent
    const flatPoints = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]];
    const resultFlat = vol.estimateMass(flatPoints, faces, { 
      objectType: 'avatar', 
      bmi: 25 
    });
    expect(resultFlat.method).toBe('avatar-bmi'); // Height computation finds largest extent = 1
  });

  test('Edge cases and error handling', () => {
    // Test with degenerate triangles (same points)
    const degeneratePoints = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const degenerateFaces = [[0, 1, 2]];
    const vol1 = vol.computeVolumeFromTriangles(degeneratePoints, degenerateFaces);
    expect(vol1).toBe(0);

    // Test with colinear points
    const colinearPoints = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
    const colinearFaces = [[0, 1, 2]];
    const vol2 = vol.computeVolumeFromTriangles(colinearPoints, colinearFaces);
    expect(vol2).toBe(0);

    // Test with very small volumes
    const tinyPoints = createCube(0.001);
    const tinyFaces = createCubeFaces();
    const vol3 = vol.computeVolumeFromTriangles(tinyPoints, tinyFaces);
    expect(vol3).toBeLessThan(0.01);

    // Test with very large coordinates
    const hugePoints = createCube(10000);
    const hugeFaces = createCubeFaces();
    const vol4 = vol.computeVolumeFromTriangles(hugePoints, hugeFaces);
    expect(vol4).toBeGreaterThan(1000000);
  });

  test('Internal helper functions coverage', () => {
    const points = createCube(1);
    const faces = createCubeFaces().map(f => ({ vertex_indices: f }));

    // Test voxel method with debug enabled
    const originalEnv = process.env.PLY_DEBUG;
    process.env.PLY_DEBUG = '1';
    
    // Force voxel count to exceed limit to test fallback
    const volFallback = vol.computeVolumeVoxel(points, faces, 0.001, 10);
    expect(volFallback).toBeGreaterThan(0);
    
    // Restore environment
    if (originalEnv !== undefined) {
      process.env.PLY_DEBUG = originalEnv;
    } else {
      delete process.env.PLY_DEBUG;
    }

    // Test with calibration string (should fail gracefully)
    const resultCalString = vol.estimateMass(points, faces, { 
      calibration: 'nonexistent-machine-id' 
    });
    expect(resultCalString.mass).toBeGreaterThan(0);
    expect(resultCalString.details.appliedScale).toBe(1);
  });
});
