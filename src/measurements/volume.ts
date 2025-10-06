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

// Attempt to consistently orient triangles by walking adjacency and flipping
// triangle vertex order when needed. Returns a new triangles array (possibly
// identical) where shared edges have opposite orientation for adjacent faces.
export function orientTriangles(triangles: number[][]): number[][] {
  const edgeMap = new Map<string, number[]>();
  const pushEdge = (i: number, j: number, triIdx: number) => {
    const key = i < j ? `${i}_${j}` : `${j}_${i}`;
    let arr = edgeMap.get(key);
    if (!arr) { arr = []; edgeMap.set(key, arr); }
    arr.push(triIdx);
  };
  for (let ti = 0; ti < triangles.length; ti++) {
    const t = triangles[ti];
    pushEdge(t[0], t[1], ti);
    pushEdge(t[1], t[2], ti);
    pushEdge(t[2], t[0], ti);
  }

  const oriented = new Array<boolean>(triangles.length).fill(false);
  const flipped = new Array<boolean>(triangles.length).fill(false);
  const outTriangles = triangles.map(t => t.slice());
  for (let start = 0; start < triangles.length; start++) {
    if (oriented[start]) continue;
    // BFS
    const q = [start]; oriented[start] = true; flipped[start] = false;
    while (q.length) {
      const cur = q.shift() as number;
      const tcur = outTriangles[cur];
      const edges: [number, number][] = [[tcur[0], tcur[1]],[tcur[1], tcur[2]],[tcur[2], tcur[0]]];
      for (const [a,b] of edges) {
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        const adj = edgeMap.get(key) || [];
        for (const nei of adj) {
          if (nei === cur) continue;
          if (oriented[nei]) continue;
          const tnei = outTriangles[nei];
          // determine neighbor's local order for this edge
          const idxA = tnei.indexOf(a);
          const idxB = tnei.indexOf(b);
          // If neighbor lists a then b in that order, local order is same as cur edge
          const neighborHasSameOrder = ((idxA !== -1 && idxB !== -1) && ((idxA + 1) % 3 === idxB));
          // For a closed manifold consistent orientation, neighbor should have reversed edge order
          const needFlip = neighborHasSameOrder;
          flipped[nei] = flipped[cur] ? !needFlip : needFlip;
          // apply flip now if needed
          if (flipped[nei]) {
            const t = outTriangles[nei]; outTriangles[nei] = [t[0], t[2], t[1]];
          }
          oriented[nei] = true;
          q.push(nei);
        }
      }
    }
  }
  return outTriangles;
}

// Robust volume computation: try to orient triangles consistently first and
// compute signed tetrahedral volume. If orientation repair doesn't significantly
// change cancellation ratio, caller still gets the oriented volume which is
// usually more reliable than raw per-triangle absolute sums.
export function computeVolumeRobust(points: number[][], triangles: number[][]): number {
  if (!triangles.length) return 0;
  // orient triangles
  const oriented = orientTriangles(triangles);
  const vol = computeVolumeFromTriangles(points, oriented);
  if (process && process.env && process.env.PLY_DEBUG) {
    console.log('computeVolumeRobust: tris=', triangles.length, 'vol=', vol);
  }
  return vol;
}

// Accept face records as arrays or objects with common keys and compute volume by triangulation
export function computeVolumeFromFaces(points: number[][], faceRecords: any[]): number {
  const triangles: number[][] = [];
  // Heuristic: many PLY models use millimeters for coordinates. If the coordinate
  // magnitude is large (e.g. > 100), assume units are millimeters and scale to meters.
  // This keeps the API simple for callers while avoiding massively wrong volumes.
  let maxAbs = 0;
  for (const p of points) for (const v of p) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  const coordScale = maxAbs > 100 ? 0.001 : 1; // mm -> m when max coordinate > 100
  const scaledPoints = coordScale === 1 ? points : points.map(p => p.map(v => v * coordScale));
  if (process && process.env && process.env.PLY_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('computeVolumeFromFaces: maxAbs=', maxAbs, 'coordScale=', coordScale, 'points=', points.length);
  }
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
  return computeVolumeFromTriangles(scaledPoints, triangles);
}

// Estimate mass from volume (m^3) given density (kg/m^3). Human body density ≈ 985 kg/m^3
export function estimateMassFromVolume(volumeM3: number, densityKgPerM3 = 985): number {
  if (!Number.isFinite(volumeM3) || volumeM3 <= 0) return 0;
  return densityKgPerM3 * volumeM3;
}

// High-level mass estimate that accepts an options object. This lets callers pass
// object-specific hints (like objectType: 'avatar') instead of relying on CLI flags.
export type MassEstimateOptions = {
  objectType?: 'avatar' | string | null;
  bmi?: number; // only used for avatar
  densityKgPerM3?: number; // override density
  calibration?: { machine?: string; scale?: number; densityKgPerM3?: number } | string | null;
  method?: 'geometric' | 'voxel' | 'slice' | 'best';
  voxelSize?: number; // meters
};

export function estimateMass(points: number[][], faceRecords: any[] | null, opts: MassEstimateOptions = {}): { mass: number; method: string; details?: any } {
  // calibration handling
  let appliedScale = 1;
  let appliedDensityOverride: number | undefined = undefined;
  if (opts.calibration) {
    if (typeof opts.calibration === 'string') {
      // treat as machine id: try to load calibration file
      try {
        const cal = require('../calibration').loadCalibrationFile(opts.calibration);
        if (cal) {
          if (cal.scale) appliedScale = cal.scale;
          if (cal.densityKgPerM3) appliedDensityOverride = cal.densityKgPerM3;
        }
      } catch (e) {}
    } else {
      const cal = opts.calibration as any;
      if (cal.scale) appliedScale = cal.scale;
      if (cal.densityKgPerM3) appliedDensityOverride = cal.densityKgPerM3;
    }
  }
  // compute geometric mass if faces present (or voxel-based if requested)
  let geomVol = 0;
  let actualMethod = opts.method || 'geometric';
  if (faceRecords && faceRecords.length) {
    const triangles: number[][] = [];
    for (const f of faceRecords) {
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
    // compute multiple estimators depending on opts.method
    if (opts.method === 'voxel') {
      const voxelSize = opts.voxelSize ?? 0.01;
      const maxVoxels = (opts as any).maxVoxels ?? 1000000;
      // apply calibration scale to points if provided
      const scaledPoints = appliedScale === 1 ? points : points.map(p=>p.map(v=>v*appliedScale));
      geomVol = computeVolumeVoxel(scaledPoints, faceRecords, voxelSize, maxVoxels);
      actualMethod = 'voxel';
    }
    else if (opts.method === 'slice') {
      const scaledPoints = appliedScale === 1 ? points : points.map(p=>p.map(v=>v*appliedScale));
      geomVol = computeVolumeBySlicing(scaledPoints, faceRecords, /*sliceCount=*/ (opts as any).sliceCount ?? 400);
      actualMethod = 'slice';
    }
    else if (opts.method === 'best') {
      // run robust geometric, slicing and voxel and take consensus (median)
    const scaledPoints = appliedScale === 1 ? points : points.map(p=>p.map(v=>v*appliedScale));
    const geom = computeVolumeRobust(scaledPoints,
        // scale to meters
    triangles);
    const slic = computeVolumeBySlicing(scaledPoints, faceRecords, (opts as any).sliceCount ?? 600);
    const vox = computeVolumeVoxel(scaledPoints, faceRecords, (opts as any).voxelSize ?? 0.005, (opts as any).maxVoxels ?? 2000000);
      const vols = [geom, slic, vox].filter(v => v > 0).sort((a, b) => a - b);
      if (!vols.length) geomVol = 0; else geomVol = vols[Math.floor(vols.length / 2)];
      actualMethod = 'best';
    }
    else {
      // default geometric robust
    const scaledPoints = appliedScale === 1 ? points : points.map(p=>p.map(v=>v*appliedScale));
    geomVol = computeVolumeRobust(scaledPoints, triangles);
      actualMethod = 'geometric';
    }
  }
  const density = appliedDensityOverride ?? opts.densityKgPerM3 ?? 985;
  const geomMass = geomVol > 0 ? estimateMassFromVolume(geomVol, density) : 0;

  // avatar-specific using height and BMI
  if (opts.objectType === 'avatar') {
    const bmi = typeof opts.bmi === 'number' && opts.bmi > 0 ? opts.bmi : 23;
    // compute height (may be in mm)
    let rawH = 0;
    try { rawH = require('./height').computeHeight(points); } catch (e) { rawH = 0; }
    const heightM = rawH > 100 ? rawH * 0.001 : rawH;
    const heightMCalibrated = heightM * appliedScale;
    if (heightM > 0) {
      const avatarMass = bmi * heightMCalibrated * heightMCalibrated;
      return { mass: avatarMass, method: 'avatar-bmi', details: { heightM, heightMCalibrated, bmi, appliedScale, appliedDensityOverride: appliedDensityOverride ?? null, geomMass, geomVol } };
    }
  }

  // include calibration details
  const details: any = { geomVol, density, appliedScale };
  if (appliedDensityOverride) details.appliedDensityOverride = appliedDensityOverride;
  return { mass: geomMass, method: actualMethod, details };
}

// Ray-triangle intersection (Möller–Trumbore). Returns true if ray origin+dir intersects triangle.
function rayIntersectsTriangle(orig: number[], dir: number[], v0: number[], v1: number[], v2: number[]): boolean {
  const EPS = 1e-9;
  const edge1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
  const edge2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
  const pvec = [dir[1]*edge2[2]-dir[2]*edge2[1], dir[2]*edge2[0]-dir[0]*edge2[2], dir[0]*edge2[1]-dir[1]*edge2[0]];
  const det = edge1[0]*pvec[0] + edge1[1]*pvec[1] + edge1[2]*pvec[2];
  if (Math.abs(det) < EPS) return false;
  const invDet = 1 / det;
  const tvec = [orig[0]-v0[0], orig[1]-v0[1], orig[2]-v0[2]];
  const u = (tvec[0]*pvec[0] + tvec[1]*pvec[1] + tvec[2]*pvec[2]) * invDet;
  if (u < 0 || u > 1) return false;
  const qvec = [tvec[1]*edge1[2]-tvec[2]*edge1[1], tvec[2]*edge1[0]-tvec[0]*edge1[2], tvec[0]*edge1[1]-tvec[1]*edge1[0]];
  const v = (dir[0]*qvec[0] + dir[1]*qvec[1] + dir[2]*qvec[2]) * invDet;
  if (v < 0 || u + v > 1) return false;
  const t = (edge2[0]*qvec[0] + edge2[1]*qvec[1] + edge2[2]*qvec[2]) * invDet;
  return t > EPS;
}

// Compute volume via voxelization: cast rays from voxel centers and count inside voxels.
export function computeVolumeVoxel(points: number[][], faceRecords: any[], voxelSize = 0.01, maxVoxels = 1000000): number {
  if (!points.length || !faceRecords || !faceRecords.length) return 0;
  // reuse coordScale heuristic
  let maxAbs = 0;
  for (const p of points) for (const v of p) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  const coordScale = maxAbs > 100 ? 0.001 : 1;
  const scaledPoints = coordScale === 1 ? points : points.map(p => p.map(v => v * coordScale));

  // build triangles
  const triangles: number[][] = [];
  for (const f of faceRecords) {
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
  if (!triangles.length) return 0;

  // bbox of scaledPoints
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of scaledPoints) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
    if (p[2] < minZ) minZ = p[2]; if (p[2] > maxZ) maxZ = p[2];
  }
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  const nx = Math.max(1, Math.ceil(dx / voxelSize));
  const ny = Math.max(1, Math.ceil(dy / voxelSize));
  const nz = Math.max(1, Math.ceil(dz / voxelSize));
  const total = nx * ny * nz;
  if (total > maxVoxels) {
    if (process && process.env && process.env.PLY_DEBUG) console.log('computeVolumeVoxel: voxel count', total, 'exceeds max', maxVoxels, 'falling back to geometric');
    return computeVolumeFromTriangles(scaledPoints, triangles) ;
  }

  // precompute triangle vertex coords and triangle bboxes to cull
  const triVerts: { a:number[]; b:number[]; c:number[]; minX:number; maxX:number; minY:number; maxY:number; minZ:number; maxZ:number }[] = [];
  for (const t of triangles) {
    const a = scaledPoints[t[0]]; const b = scaledPoints[t[1]]; const c = scaledPoints[t[2]];
    triVerts.push({ a, b, c, minX: Math.min(a[0],b[0],c[0]), maxX: Math.max(a[0],b[0],c[0]), minY: Math.min(a[1],b[1],c[1]), maxY: Math.max(a[1],b[1],c[1]), minZ: Math.min(a[2],b[2],c[2]), maxZ: Math.max(a[2],b[2],c[2]) });
  }

  let insideCount = 0;
  const dir = [1,0,0]; // cast +X
  for (let iz = 0; iz < nz; iz++) {
    const z = minZ + (iz + 0.5) * (dz / nz);
    for (let iy = 0; iy < ny; iy++) {
      const y = minY + (iy + 0.5) * (dy / ny);
      for (let ix = 0; ix < nx; ix++) {
        const x = minX + (ix + 0.5) * (dx / nx);
        const origin = [x,y,z];
        // cull triangles by bbox
        let hits = 0;
        for (const tv of triVerts) {
          if (origin[0] > tv.maxX + 1e-12) continue; // triangle is entirely to the left of origin
          if (origin[1] < tv.minY - 1e-12 || origin[1] > tv.maxY + 1e-12) continue;
          if (origin[2] < tv.minZ - 1e-12 || origin[2] > tv.maxZ + 1e-12) continue;
          if (rayIntersectsTriangle(origin, dir, tv.a, tv.b, tv.c)) hits++;
        }
        if (hits % 2 === 1) insideCount++;
      }
    }
  }

  const voxelVol = (dx / nx) * (dy / ny) * (dz / nz);
  return insideCount * voxelVol;
}

// Compute volume by numerical integration of horizontal cross-section areas.
// This is often robust for human-shaped meshes: sample slices along the principal
// axis (use PCA axis with largest extent) and sum slice areas (trapezoidal rule).
export function computeVolumeBySlicing(points: number[][], faceRecords: any[], sliceCount = 200): number {
  if (!points.length) return 0;
  // reuse mm->m heuristic
  let maxAbs = 0;
  for (const p of points) for (const v of p) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  const coordScale = maxAbs > 100 ? 0.001 : 1;
  const scaled = coordScale === 1 ? points : points.map(p => p.map(v => v * coordScale));

  // find PCA principal axis and project points to that axis as 'height' coordinate
  let axis = [0,1,0];
  try { const pca = require('./pca').computePCA(scaled); axis = pca.eigenvectors[0]; } catch (e) {}
  const projs = scaled.map(p => p[0]*axis[0] + p[1]*axis[1] + p[2]*axis[2]);
  let minH = Infinity, maxH = -Infinity;
  for (const v of projs) { if (v < minH) minH = v; if (v > maxH) maxH = v; }
  if (!isFinite(minH) || !isFinite(maxH) || maxH <= minH) return 0;

  const areas: number[] = [];
  const { computeCrossSectionAreaMesh } = require('./crossSection');
  // build triangle list once
  const triangles: number[][] = [];
  for (const f of faceRecords) {
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
  for (let i = 0; i <= sliceCount; i++) {
    const t = i / sliceCount;
    const h = minH + t * (maxH - minH);
    // need to map back to Y coordinate for cross-section which expects y as second coord
    // Create a transformed point set where y is replaced by projection onto axis
    const transformed: number[][] = scaled.map((p, idx) => {
      // compute coordinate along axis (height) and keep other two components as-is
      const proj = projs[idx];
      // map proj to y dimension by shifting so that proj == h corresponds to y == h
      return [p[0], proj, p[2]];
    });
  // compute area from actual mesh-triangle intersections with plane
  const area = computeCrossSectionAreaMesh(scaled, triangles, axis, h);
    areas.push(area);
  }
  // trapezoidal integrate
  let sum = 0;
  const dh = (maxH - minH) / sliceCount;
  for (let i = 0; i < areas.length - 1; i++) sum += 0.5 * (areas[i] + areas[i+1]) * dh;
  return Math.abs(sum);
}
