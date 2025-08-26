import { PlyHeaderParser } from './header';
import { PlyElement } from './element';
import { PlyData } from './data';
import { byteOrderMap } from './utils';

/**
 * Read a binary or ASCII PLY from a Buffer and return a fully parsed PlyData.
 * This is the root-level implementation previously living under src/core.
 */
export function readBinaryPly(buffer: Buffer): PlyData {
  // Use a buffer-backed reader so we correctly locate the header end without relying on ascii search
  let offset = 0;
  const rawReader = { read(n: number): Buffer | null {
    if (offset >= buffer.length) return null;
    const end = Math.min(offset + n, buffer.length);
    const chunk = buffer.slice(offset, end);
    offset = end;
    return chunk;
  } };

  const reader = { read(n: number): Buffer | string { const r = rawReader.read(n); return r === null ? '' : r; } };

  const headerLines: string[] = [];
  // collect header lines using PlyHeaderLines
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PlyHeaderLines } = require('./header');
  for (const l of new PlyHeaderLines(reader)) headerLines.push(l);

  const headerEnd = offset; // reader advanced past header
  // parser expects lines after the initial 'ply' line
  const parser = new PlyHeaderParser(headerLines);

  const elements = parser.elements.map(e => new PlyElement(e.name, e.properties, e.count, e.comments));
  const pd = new PlyData(elements, parser.format === 'ascii', (byteOrderMap as any)[parser.format as string] ?? '=', parser.comments, parser.objInfo);

  const dataBuf = buffer.subarray(headerEnd);

  let cursor = 0;
  for (const elt of pd.elements) {
    if (pd.text) {
      // ASCII: slice lines for this element
      const s = dataBuf.subarray(cursor).toString('utf8');
      (elt as any)._read(Buffer.from(s, 'utf8'), true, pd.byteOrder, undefined, {});
      // we don't advance cursor for ASCII (we passed full tail each time)
    } else {
      const bufSlice = dataBuf.subarray(cursor);
      const consumed = (elt as any)._read(bufSlice, false, pd.byteOrder, undefined, {});
      if (typeof consumed !== 'number') throw new Error(`element ${elt.name} did not return consumed byte count`);
      cursor += consumed;
    }
  }

  return pd;
}

/**
 * Serialize a PlyData into a binary Buffer. If ply.text is true this will
 * still write an ASCII PLY; for binary output ensure ply.text === false.
 */
export function writeBinaryPly(ply: PlyData): Buffer {
  const header = ply.header + '\n';
  const out: Buffer[] = [];
  out.push(Buffer.from(header, 'ascii'));

  for (const elt of ply.elements) {
    const chunks: Buffer[] = [];
    (elt as any)._write({ push: (b: Buffer | string) => {
      chunks.push(typeof b === 'string' ? Buffer.from(b, 'utf8') : b);
    } }, ply.text, ply.byteOrder);
    for (const c of chunks) out.push(c);
  }

  return Buffer.concat(out);
}
