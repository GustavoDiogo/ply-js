import { computePCA } from './pca';

export function computeHeight(points: number[][]): number {
  if (!points.length) return 0;
  // Scale coordinates if they look like millimeters
  let maxAbs = 0;
  for (const p of points) for (const v of p) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
  const coordScale = maxAbs > 100 ? 0.001 : 1;
  const scaled = coordScale === 1 ? points : points.map(p => p.map(v => v * coordScale));

  // PCA to find candidate principal axes; choose axis with largest projected extent
  const pca = computePCA(scaled);
  const mean = pca.mean;
  const axes = pca.eigenvectors;
  let bestExtent = 0;
  for (const axis of axes) {
    let minP = Infinity, maxP = -Infinity;
    for (const p of scaled) {
      const d0 = p[0] - mean[0]; const d1 = p[1] - mean[1]; const d2 = p[2] - mean[2];
      const proj = d0*axis[0] + d1*axis[1] + d2*axis[2];
      if (proj < minP) minP = proj;
      if (proj > maxP) maxP = proj;
    }
    const extent = maxP - minP;
    if (extent > bestExtent) bestExtent = extent;
  }
  return bestExtent;
}
