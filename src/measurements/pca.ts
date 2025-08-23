// Basic linear algebra helpers for small matrices
function matVecMul(mat:number[][], vec:number[]) { return [mat[0][0]*vec[0]+mat[0][1]*vec[1]+mat[0][2]*vec[2], mat[1][0]*vec[0]+mat[1][1]*vec[1]+mat[1][2]*vec[2], mat[2][0]*vec[0]+mat[2][1]*vec[1]+mat[2][2]*vec[2]]; }
function vecDot(a:number[], b:number[]) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function vecNorm(a:number[]) { return Math.sqrt(vecDot(a,a)) || 1; }
function vecScale(a:number[], s:number) { return [a[0]*s,a[1]*s,a[2]*s]; }
function vecSub(a:number[], b:number[]) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function outer(a:number[], b:number[]) { return [[a[0]*b[0], a[0]*b[1], a[0]*b[2]],[a[1]*b[0], a[1]*b[1], a[1]*b[2]],[a[2]*b[0], a[2]*b[1], a[2]*b[2]]]; }

// Build covariance matrix (3x3) for points (centered)
function covarianceMatrix(points: number[][], mean: number[]) {
  const C = [[0,0,0],[0,0,0],[0,0,0]];
  const n = points.length;
  for (const p of points) {
    const d = vecSub(p, mean);
    C[0][0] += d[0]*d[0]; C[0][1] += d[0]*d[1]; C[0][2] += d[0]*d[2];
    C[1][0] += d[1]*d[0]; C[1][1] += d[1]*d[1]; C[1][2] += d[1]*d[2];
    C[2][0] += d[2]*d[0]; C[2][1] += d[2]*d[1]; C[2][2] += d[2]*d[2];
  }
  const inv = 1 / Math.max(1, n-1);
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) C[i][j] *= inv;
  return C;
}

// Power iteration for dominant eigenpair
function powerIteration(mat:number[][], maxIter=100, tol=1e-9) {
  let b = [Math.random(), Math.random(), Math.random()];
  let lambda = 0;
  for (let i=0;i<maxIter;i++) {
    const Mb = matVecMul(mat, b);
    const norm = vecNorm(Mb);
    if (!norm) break;
    b = vecScale(Mb, 1/norm);
    const lambdaNew = vecDot(b, matVecMul(mat,b));
    if (Math.abs(lambdaNew - lambda) < tol) { lambda = lambdaNew; break; }
    lambda = lambdaNew;
  }
  return { eigenvalue: lambda, eigenvector: b };
}

// Compute all three eigenpairs by deflation
export function computePCA(points: number[][]) {
  if (!points.length) return { mean: [0,0,0], eigenvalues: [0,0,0], eigenvectors: [[1,0,0],[0,1,0],[0,0,1]] };
  const mean = (function(){ const c=[0,0,0]; for(const p of points){c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];} return [c[0]/points.length,c[1]/points.length,c[2]/points.length]; })();
  let C = covarianceMatrix(points, mean);
  const eigs:number[] = [];
  const vecs:number[][] = [];
  for (let k=0;k<3;k++) {
    const { eigenvalue, eigenvector } = powerIteration(C, 200, 1e-12);
    const v = eigenvector.slice();
    const norm = vecNorm(v);
    if (norm === 0) break;
    const vUnit = vecScale(v, 1/norm);
    eigs.push(eigenvalue);
    vecs.push(vUnit);
    // deflate: C = C - eigenvalue * v * v^T
    const ov = outer(vUnit, vUnit);
    for (let i=0;i<3;i++) for (let j=0;j<3;j++) C[i][j] -= eigenvalue * ov[i][j];
  }
  // If less than 3 found, pad with orthonormal basis
  while (vecs.length < 3) {
    const idx = vecs.length;
    const basis = [[1,0,0],[0,1,0],[0,0,1]][idx];
    // ensure orthogonal to previous
    let b = basis.slice();
    for (const v of vecs) {
      const proj = vecScale(v, vecDot(b,v));
      b = vecSub(b, proj);
    }
    const n = vecNorm(b);
    vecs.push(vecScale(b, 1/n));
    eigs.push(0);
  }
  return { mean, eigenvalues: eigs, eigenvectors: vecs };
}

// Align points to PCA basis (center at mean, rotate to eigenvectors)
export function alignPointsToPCA(points: number[][]) {
  const pca = computePCA(points);
  const mean = pca.mean;
  const R = pca.eigenvectors; // rows are eigenvectors
  const aligned: number[][] = [];
  for (const p of points) {
    const d = vecSub(p, mean);
    // project d onto each eigenvector
    aligned.push([vecDot(d, R[0]), vecDot(d, R[1]), vecDot(d, R[2])]);
  }
  return { aligned, mean, eigenvectors: R, eigenvalues: pca.eigenvalues };
}

// Canonicalize points: center at origin, align to PCA, optionally scale to unit height (or provided scale)
export function canonicalizePoints(points: number[][], { scaleToUnitHeight = false } = {}): { points: number[][], mean: number[], eigenvectors:number[][] } {
  const res = alignPointsToPCA(points);
  let pts = res.aligned;
  if (scaleToUnitHeight) {
    const h = (function(){ if (!pts.length) return 0; let minY=Infinity,maxY=-Infinity; for(const p of pts){ if(p[1]<minY)minY=p[1]; if(p[1]>maxY)maxY=p[1]; } return maxY-minY; })();
    if (h > 0) {
      const s = 1 / h;
      pts = pts.map(p => [p[0]*s, p[1]*s, p[2]*s]);
    }
  }
  return { points: pts, mean: res.mean, eigenvectors: res.eigenvectors };
}
