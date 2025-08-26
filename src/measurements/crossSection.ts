// 2D convex hull (Monotone chain) for points represented as [x,y]
function convexHull2D(points: number[][]): number[][] {
  if (points.length <= 1) return points.slice();
  const pts = points.slice().sort((a,b)=> a[0] !== b[0] ? a[0]-b[0] : a[1]-b[1]);
  const cross = (o:number[], a:number[], b:number[]) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
  const lower: number[][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: number[][] = [];
  for (let i = pts.length-1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

function distance2D(a:number[], b:number[]) { const dx=a[0]-b[0], dy=a[1]-b[1]; return Math.hypot(dx,dy); }
function perimeter2D(points: number[][]) {
  if (points.length <= 1) return 0;
  let p = 0;
  for (let i=0;i<points.length;i++) p += distance2D(points[i], points[(i+1)%points.length]);
  return p;
}

// Compute circumference of horizontal cross-section at height y by selecting points near that Y and computing convex hull perimeter in XZ plane
export function computeCrossSectionCircumference(points: number[][], y: number, thickness = 0.002): number {
  const half = thickness/2;
  const slice: number[][] = [];
  for (const p of points) {
    if (Math.abs(p[1] - y) <= half) slice.push([p[0], p[2]]); // X,Z -> treat as X,Y in 2D
  }
  if (!slice.length) return 0;
  const hull = convexHull2D(slice);
  return perimeter2D(hull);
}

// Compute polygon area (signed) using shoelace formula for 2D points
function polygonArea(points: number[][]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - a[1] * b[0];
  }
  return Math.abs(sum) * 0.5;
}

// Compute cross-section area at height y by taking slice points and computing convex hull area
export function computeCrossSectionArea(points: number[][], y: number, thickness = 0.002): number {
  const half = thickness / 2;
  const slice: number[][] = [];
  for (const p of points) {
    if (Math.abs(p[1] - y) <= half) slice.push([p[0], p[2]]);
  }
  if (!slice.length) return 0;
  const hull = convexHull2D(slice);
  return polygonArea(hull);
}

// Compute cross-section area by intersecting mesh triangles with a plane
// defined by projection axis and scalar h (dot(p, axis) == h).
export function computeCrossSectionAreaMesh(points: number[][], triangles: number[][], axis: number[], h: number): number {
  if (!points.length || !triangles.length) return 0;
  // build orthonormal basis (u,v) for plane perpendicular to axis
  const ax = axis.slice();
  const axLen = Math.hypot(ax[0], ax[1], ax[2]);
  if (axLen === 0) return 0;
  ax[0] /= axLen; ax[1] /= axLen; ax[2] /= axLen;
  // choose arbitrary vector not parallel to axis
  const arbitrary = Math.abs(ax[0]) < 0.9 ? [1,0,0] : [0,1,0];
  const u = [
    arbitrary[1]*ax[2] - arbitrary[2]*ax[1],
    arbitrary[2]*ax[0] - arbitrary[0]*ax[2],
    arbitrary[0]*ax[1] - arbitrary[1]*ax[0]
  ];
  const uLen = Math.hypot(u[0], u[1], u[2]);
  if (uLen === 0) return 0;
  u[0] /= uLen; u[1] /= uLen; u[2] /= uLen;
  const v = [ ax[1]*u[2] - ax[2]*u[1], ax[2]*u[0] - ax[0]*u[2], ax[0]*u[1] - ax[1]*u[0] ];

  const ips: number[][] = [];
  for (const t of triangles) {
    const a = points[t[0]]; const b = points[t[1]]; const c = points[t[2]];
    if (!a || !b || !c) continue;
    const da = a[0]*ax[0] + a[1]*ax[1] + a[2]*ax[2] - h;
    const db = b[0]*ax[0] + b[1]*ax[1] + b[2]*ax[2] - h;
    const dc = c[0]*ax[0] + c[1]*ax[1] + c[2]*ax[2] - h;
    const ds = [da, db, dc];
    const verts = [a,b,c];
    for (let i=0;i<3;i++) {
      const j=(i+1)%3;
      const di = ds[i], dj = ds[j];
      if (di === 0) {
        const p = verts[i]; ips.push([ p[0]*u[0] + p[1]*u[1] + p[2]*u[2], p[0]*v[0] + p[1]*v[1] + p[2]*v[2] ]);
      }
      if (di * dj < 0) {
        const tparam = di / (di - dj);
        const p0 = verts[i], p1 = verts[j];
        const ip = [ p0[0] + (p1[0]-p0[0]) * tparam, p0[1] + (p1[1]-p0[1]) * tparam, p0[2] + (p1[2]-p0[2]) * tparam ];
        ips.push([ ip[0]*u[0] + ip[1]*u[1] + ip[2]*u[2], ip[0]*v[0] + ip[1]*v[1] + ip[2]*v[2] ]);
      }
    }
  }
  if (!ips.length) return 0;
  // convex hull of intersection points in 2D and area
  const hull = convexHull2D(ips);
  return polygonArea(hull);
}
