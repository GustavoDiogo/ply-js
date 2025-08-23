export function computeAABB(points: number[][]) {
  if (!points.length) return { min: [0,0,0], max: [0,0,0], size: [0,0,0] };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return { min, max, size: [max[0]-min[0], max[1]-min[1], max[2]-min[2]] };
}
