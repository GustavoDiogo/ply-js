export function computeCentroid(points: number[][]): number[] {
  if (!points.length) return [0,0,0];
  const c = [0,0,0];
  for (const p of points) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  return [c[0]/points.length, c[1]/points.length, c[2]/points.length];
}
