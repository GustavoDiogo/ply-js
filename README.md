# ply-js

[![GitHub license](https://img.shields.io/badge/license-GPLv3-blue.svg)](https://github.com/GustavoDiogo/ply-js/blob/main/COPYING) [![npm version](https://img.shields.io/npm/v/ply-js.svg?style=flat)](https://www.npmjs.com/package/ply-js) [![(Runtime) Build and Test](https://github.com/GustavoDiogo/ply-js/actions/workflows/runtime_build_and_test.yml/badge.svg)](https://github.com/GustavoDiogo/ply-js/actions/workflows/runtime_build_and_test.yml) [![(Compiler) TypeScript](https://github.com/GustavoDiogo/ply-js/actions/workflows/compiler_typescript.yml/badge.svg?branch=main)](https://github.com/GustavoDiogo/ply-js/actions/workflows/compiler_typescript.yml) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/GustavoDiogo/ply-js/blob/main/CONTRIBUTING.md)

A compact, strongly-typed TypeScript library to read, write and analyze PLY (Polygon File Format) 3D meshes. Inspired by python-plyfile and focused on practical utilities for avatar and mesh processing: parsing, serialization, volume estimation, axis-aligned bounds and simple sizing helpers.

## Features

- Full support for ASCII and common binary PLY encodings (little/big-endian).
- Read/write helpers for PLY headers and element data.
- Measurement helpers: AABB, centroid, cross-section perimeter, multiple volume estimators, and related utilities.
- High-level estimate helpers including per-scanner calibration support and an avatar/BMI estimation path.

## Quick example

Read an ASCII PLY provided as lines:

```ts
import { readPlyFromLines } from 'ply-js';

const ply = readPlyFromLines(lines);
const vertexElement = ply.elements.find(e => e.name === 'vertex');
const faceElement = ply.elements.find(e => e.name === 'face' || e.name === 'polygon');
```

Estimate mass programmatically (with an optional calibration object):

```ts
import { estimateMass } from 'ply-js';

const result = estimateMass(points, faces, { objectType: 'avatar', calibration: myCalibration });
console.log(result.massKg, result.heightM);
```

## Calibration

Per-scanner calibrations are supported and persisted as JSON. See `CALIBRATION.md` for instructions. Example scripts live in `examples/` and are runnable via the package scripts.

```bash
pnpm calibrate        # run examples/calibrate.ts to create a calibration JSON
pnpm apply:calibration # run examples/apply-calibration.ts to demonstrate applying a saved calibration
```

## Selected API

- `readPlyFromLines(lines: string[]): PlyDocument`
- `readBinaryPly(buffer: Buffer): PlyDocument`
- `writePly(ply: PlyDocument): string`
- `writeBinaryPly(ply: PlyDocument): Buffer`
- `computeAABB(points: Point[]): AABB`
- `computeCentroid(points: Point[]): Point`
- `computeVolumeFromFaces(points: Point[], faces: Face[]): number`
- `estimateMass(points, faces, opts?): { massKg, heightM, volumes }`

Refer to the `dist` typings and `src` files for full signatures and examples.

## Contributing & License

See `CONTRIBUTING.md` for contribution guidelines. This project is licensed under the GNU General Public License v3 (GPL-3.0-or-later) — see `COPYING` and `package.json` for details.

---
