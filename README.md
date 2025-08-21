# plyjs

> A modern TypeScript port of [`python-plyfile`](https://github.com/dranjan/python-plyfile) for reading and writing `.ply` 3D mesh files.

---

## ✨ Features

- ✅ Read and write **ASCII and binary** `.ply` files
- ✅ Support for scalar and list properties
- ✅ Endian-aware binary decoding
- ✅ Fully typed with TypeScript
- ✅ Works with Node.js (Buffer and streams)

---

## 🚀 Quick Usage

###  Load a .ply file (ASCII or Binary)

```ts
import { readPly } from 'plyjs';
import fs from 'fs';

const buffer = fs.readFileSync('mesh.ply');
const ply = readPly(buffer);

console.log(ply.elements[0].name); // e.g., 'vertex'
console.log(ply.elements[0].data); // TypedArray or array of lists
```

### Write a .ply file (ASCII)

```ts
import { writePly } from 'plyjs';
import fs from 'fs';

const data = {
  x: new Float32Array([0, 1, 2]),
  y: new Float32Array([0, 0, 0]),
  z: new Float32Array([0, 1, 0]),
};

const ply = PlyData.from({
  vertex: {
    x: data.x,
    y: data.y,
    z: data.z,
  },
});

const content = writePly(ply);
fs.writeFileSync('out.ply', content);
```

### Write a .ply file (Binary)

```ts
import { writeBinaryPly } from 'plyjs';
const binary = writeBinaryPly(ply);
fs.writeFileSync('out-binary.ply', binary);
```