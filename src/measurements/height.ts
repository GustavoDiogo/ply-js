export function computeHeight(points: number[][]): number {
  if (!points.length) return 0;
  let minY = Infinity, maxY = -Infinity;
  for (const p of points) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  return maxY - minY;
}
