# plyjs

A modern TypeScript library for reading and writing `.ply` 3D mesh files (ASCII and binary), inspired by [`python-plyfile`](https://github.com/dranjan/python-plyfile).

## Features

- Read/write ASCII and binary `.ply` files
- Scalar and list property support
- Endian-aware binary decoding
- Fully typed API
- Node.js compatible

## Basic Usage

### Read ASCII `.ply`
```ts
import { readPlyFromLines } from 'plyjs';
import fs from 'fs';
const lines = fs.readFileSync('mesh.ply', 'utf-8').split(/\r?\n/);
const ply = readPlyFromLines(lines);
```

### Read Binary `.ply`
```ts
import { readBinaryPly } from 'plyjs';
import fs from 'fs';
const buffer = fs.readFileSync('mesh.ply');
const ply = readBinaryPly(buffer);
```

### Write ASCII `.ply`
```ts
import { writePly } from 'plyjs';
// writePly writes to a stream or custom writer (see API docs)
```

### Write Binary `.ply`
```ts
import { writeBinaryPly } from 'plyjs';
const binary = writeBinaryPly(ply);
// fs.writeFileSync('out-binary.ply', binary);
```