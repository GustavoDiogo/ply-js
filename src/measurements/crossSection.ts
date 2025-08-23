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
