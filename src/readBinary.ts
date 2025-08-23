import { PlyHeaderParser } from './header';
import { PlyElement } from './element';
import { PlyData } from './data';
import { byteOrderMap } from './utils';

/**
 * Read a binary or ASCII PLY from a Buffer and return a fully parsed PlyData.
 * This is the root-level implementation previously living under src/core.
 */
export function readBinaryPly(buffer: Buffer): PlyData {
  const ascii = buffer.toString('ascii');
  const idx = ascii.indexOf('\nend_header');
  if (idx === -1) throw new Error('no end_header in buffer');
  // include the line containing 'end_header' and following newline
  const headerEnd = ascii.indexOf('\n', idx + 1) + 1;
  const headerText = ascii.slice(0, headerEnd);
  const headerLines = headerText.split(/\r?\n/).filter(Boolean);
  const parser = new PlyHeaderParser(headerLines.slice(1));

  const elements = parser.elements.map(e => new PlyElement(e.name, e.properties, e.count, e.comments));
  const pd = new PlyData(elements, parser.format === 'ascii', (byteOrderMap as any)[parser.format as string] ?? '=', parser.comments, parser.objInfo);

  const dataBuf = buffer.subarray(headerEnd);

  for (const elt of pd.elements) {
    // let each element parse from the buffer. Element._read will throw if insufficient data.
    if (pd.text) {
      // ASCII: pass the data as UTF-8 string buffer
      (elt as any)._read(Buffer.from(dataBuf.toString('utf8')), true, pd.byteOrder, undefined, {});
    } else {
      (elt as any)._read(dataBuf, false, pd.byteOrder, undefined, {});
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
