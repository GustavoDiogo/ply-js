Simple examples demonstrating generic measurement utilities included in the library.

Run the TypeScript examples (requires ts-node or build):

- Development (fast):
  - Install dev deps: npm install --save-dev ts-node @types/node
  - Run any example directly with:
    - npx ts-node examples/simple-metrics.ts
    - npx ts-node examples/height.ts
    - npx ts-node examples/weight.ts
    - npx ts-node examples/summary.ts

- Build+Run (not recommended for examples):
  - npm run build
  - node dist/examples/simple-metrics.js

Notes:
- Examples parse the PLY header first. For binary PLYs the example will print header metadata and not attempt full binary body parsing by default.
- ASCII PLYs are fully parsed and metrics (height, AABB, centroid, volume) are computed when possible.
- Examples are excluded from the published package but are kept in the repo for users and CI.

## Calibration (examples)

The examples folder includes scripts that demonstrate creating and applying
per-scanner calibrations. See the repository `CALIBRATION.md` for usage notes
and edit `examples/calibrate.ts` to point to your labeled scans.

Quick commands (from repo root):

```bash
pnpm calibrate
pnpm apply:calibration
```
