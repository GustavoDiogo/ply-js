# ply-js

ply-js is an npm package and a compact, strongly-typed TypeScript library for reading, writing and analyzing PLY (Polygon File Format) 3D meshes. The project is inspired by — and includes ideas and behavior ported from — the python-plyfile library.

This repository focuses on robust PLY parsing (ASCII and binary) and a small set of practical mesh utilities useful for analytics, engineering and tooling workflows.

## Highlights

- Full support for ASCII and common binary PLY encodings (little/big-endian)
- Read/write helpers for PLY headers and element data
- Measurement primitives: axis-aligned bounding box (AABB), centroid, cross-section perimeter, volume estimation and related helpers
- Lightweight, fully-typed TypeScript API with runtime artifacts compiled to `dist`

## Example usage (concise)

Read an ASCII PLY provided as lines:

```ts
import { readPlyFromLines } from 'ply-js';
// lines: string[]
const ply = readPlyFromLines(lines);
const vertexElement = ply.elements.find(e => e.name === 'vertex');
const faceElement = ply.elements.find(e => e.name === 'face' || e.name === 'polygon');
```

Read a binary PLY from a Buffer:

```ts
import { readBinaryPly } from 'ply-js';
// buf: Buffer
const ply = readBinaryPly(buf);
```

Write helpers return either strings or Buffers depending on ascii/binary form:

```ts
import { writePly, writeBinaryPly } from 'ply-js';
// writePly(ply) => string
// writeBinaryPly(ply) => Buffer
```

## Measurement helpers (selected)

- computeAABB(points) — axis-aligned bounding box from points
- computeCentroid(points) — centroid of a point set
- computeVolumeFromFaces(points, faces) — approximate closed-mesh volume via triangle integration
- computeCrossSectionCircumference(points, y, thickness?) — perimeter of horizontal cross-section

These helpers are intentionally small, composable building blocks for higher-level analysis and tooling.

## Calibration

This project includes a per-scanner calibration workflow to improve height and
mass estimates when you have labeled scans (true height in meters and mass in
kg). See `CALIBRATION.md` for full instructions and examples.

Quick commands:

```bash
pnpm calibrate        # run examples/calibrate.ts to create a calibration JSON
pnpm apply:calibration # run examples/apply-calibration.ts to demonstrate applying a saved calibration
```

Programmatic usage: pass a calibration object to `estimateMass`, e.g.:

```ts
const res = estimateMass(points, faces, { calibration: myCalibrationObj });
```

## API surface (selected)

- readPlyFromLines(lines: string[]): PlyDocument
- readBinaryPly(buffer: Buffer): PlyDocument
- writePly(ply: PlyDocument): string
- writeBinaryPly(ply: PlyDocument): Buffer
- computeAABB(points: Point[]): AABB
- computeCentroid(points: Point[]): Point
- computeVolumeFromFaces(points: Point[], faces: Face[]): number

Refer to the generated API typings in `dist`/`src` for complete signatures.

## Packaging & publishing notes

This project is prepared for npm publishing. The published package intentionally contains only runtime artifacts (compiled `dist`), `README.md` and `COPYING` to avoid shipping private examples or sample data. Keep any private sample datasets or large example assets out of the package and use a private registry or separate repository for non-public content.

## Porting note

Design and behavior are influenced by the python-plyfile project; some parsing approaches and conventions are ported/adapted to TypeScript while aiming for a small, idiomatic API for Node.js and toolchains that consume compiled artifacts.

## License

See `COPYING` and `package.json` for license details.

## Contributing

Issues, bug reports and focused pull requests are welcome. Prioritize clear tests for parsing edge cases (mixed ASCII/binary, unusual property lists, and face index encodings) and keep measurement helpers small and well-documented.

