# ply-js

A compact, strongly-typed TypeScript library to read, write and analyze PLY (Polygon File Format) 3D meshes. Inspired by python-plyfile and focused on practical utilities for avatar and mesh processing: parsing, serialization, volume estimation, axis-aligned bounds and simple sizing helpers.

## Highlights

- Parse ASCII and binary `.ply` files (vertex and face elements)
- Read/write helpers for ASCII and binary PLY
- Measurement helpers: axis-aligned bounding box (AABB), centroid, cross-section circumference, volume estimate and mass estimate
- Lightweight, fully typed TypeScript API
- Package published with only runtime artifacts (dist)


## Quickstart

Read an ASCII `.ply` from lines:

```ts
import { readPlyFromLines } from 'ply-js';
import fs from 'fs';
const lines = fs.readFileSync('mesh.ply', 'utf8').split(/\r?\n/);
const ply = readPlyFromLines(lines);
const vertices = ply.elements.find(e => e.name === 'vertex')?.data;
const faces = ply.elements.find(e => e.name === 'face' || e.name === 'polygon')?.data;
```

Read a binary `.ply`:

```ts
import { readBinaryPly } from 'ply-js';
import fs from 'fs';
const buf = fs.readFileSync('mesh.ply');
const ply = readBinaryPly(buf);
```

Write utilities:

```ts
import { writePly, writeBinaryPly } from 'ply-js';
// writePly(wallet) => ascii string or stream
// writeBinaryPly(ply) => Buffer
```


## Measurement & analysis

Primary helpers for estimating physical quantities from meshes:

- measureAvatarFromPoints(points, faces?, system?, options?)
  - points: Array of [x,y,z] coordinates
  - faces: optional face records (arrays or objects with vertex indices) used for accurate volume estimates
  - system: 'US' | 'BR' | 'EURO' (controls sizing labels)
  - options: { sex?: 'male'|'female'|'other' }
  - returns height (m), heightCentimeters, volumeM3, massKg, aabb, centroid and sizing suggestions (shirt/pants/shoe)

- computeVolumeFromFaces(points, faces)
  - triangulates faces and computes absolute mesh volume (m^3) — use when faces are available for best accuracy

- computeCrossSectionCircumference(points, y, thickness?)
  - computes a horizontal cross-section perimeter at height y (useful for chest/waist estimates)

Notes
- The measurement helpers detect and normalize common source units (mm, cm, m) using the computed height and scale the point cloud to meters before computing volume and circumferences.
- Volume-based mass uses a configurable density (default ≈ 985 kg/m^3) to produce a reasonable mass estimate for human-like meshes.


## API surface (selected)

- readPlyFromLines(lines)
- readBinaryPly(buffer)
- writePly(ply)
- writeBinaryPly(ply)
- measureAvatarFromPoints(points, faces?, system?, options?)
- computeVolumeFromFaces(points, faces)
- computeCrossSectionCircumference(points, y, thickness?)
- computeAABB(points)
- computeCentroid(points)


## Publishing notes

This repository keeps examples and raw sample data out of the published npm package intentionally. The package.json `files` array contains only the compiled `dist`, `README.md` and `COPYING` to protect private examples. If you operate a private or commercial offering, keep the source examples out of any public registry and use a private registry or private repository for non-public assets.


## License

This project includes code under the original GPL-derived header and is packaged for distribution under MIT (see `COPYING` and `package.json` for license information).


## Contributing / Support

For issues or questions, open an issue in the repository. Keep contributions focused on producing clear, well-tested parsing and measurement utilities; publishing decisions and distribution are intentional to protect example assets.