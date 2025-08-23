// Triangulate polygon indices (fan triangulation)
function triangulateIndexList(idxList: number[]): number[][] {
  const tris: number[][] = [];
  for (let i = 1; i + 1 < idxList.length; i++) tris.push([idxList[0], idxList[i], idxList[i + 1]]);
  return tris;
}

// Compute signed volume of a tetrahedron (origin, a, b, c)
function signedTetraVolume(a: number[], b: number[], c: number[]): number {
  return (1.0 / 6.0) * (
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])
  );
}

// Compute absolute volume from list of points and triangle index list
export function computeVolumeFromTriangles(points: number[][], triangles: number[][]): number {
  let vol = 0;
  for (const t of triangles) {
    const a = points[t[0]]; const b = points[t[1]]; const c = points[t[2]];
    if (!a || !b || !c) continue;
    vol += signedTetraVolume(a, b, c);
  }
  return Math.abs(vol);
}

// Accept face records as arrays or objects with common keys and compute volume by triangulation
export function computeVolumeFromFaces(points: number[][], faceRecords: any[]): number {
  const triangles: number[][] = [];
  for (const f of faceRecords) {
    // possible shapes: { vertex_indices: [..] } or { vertex_index: [..] } or plain array
    let idxList: number[] | undefined;
    if (Array.isArray(f)) idxList = f as number[];
    else if (Array.isArray(f.vertex_indices)) idxList = f.vertex_indices;
    else if (Array.isArray(f.vertex_index)) idxList = f.vertex_index;
    else if (Array.isArray(f.indices)) idxList = f.indices;
    else if (Array.isArray(f.vertices)) idxList = f.vertices;
    if (!idxList) continue;
    const tris = triangulateIndexList(idxList);
    for (const t of tris) triangles.push(t);
  }
  return computeVolumeFromTriangles(points, triangles);
}

// Estimate mass from volume (m^3) given density (kg/m^3). Human body density ≈ 985 kg/m^3
export function estimateMassFromVolume(volumeM3: number, densityKgPerM3 = 985): number {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return 0;
  return densityKgPerM3 * volumeM3;
}
