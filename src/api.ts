import { PlyHeaderParser } from './header';
import { PlyElement } from './element';
import { PlyData } from './data';
import { byteOrderMap } from './utils';
import type { ByteOrder } from './types';

export function readPlyFromLines(lines: Iterable<string>): PlyData {
  const arr = Array.isArray(lines) ? (lines as string[]) : Array.from(lines);
  // find end_header
  const endIdx = arr.findIndex(l => l.trim() === 'end_header');
  if (endIdx === -1) throw new Error('no end_header');
  const headerLines = arr.slice(0, endIdx + 1);
  const dataLines = arr.slice(endIdx + 1);

  // Header parser expects lines after the initial 'ply' line
  if (headerLines.length === 0 || headerLines[0].trim() !== 'ply') throw new Error("expected 'ply' as first line");
  const headerIterable = headerLines.slice(1);
  const parser = new PlyHeaderParser(headerIterable);

  const elements = parser.elements.map(e => new PlyElement(e.name, e.properties, e.count, e.comments));
  const pd = new PlyData(elements, parser.format === 'ascii', (byteOrderMap as any)[parser.format as string] ?? '=' , parser.comments, parser.objInfo);

  if (parser.format === 'ascii') {
    let offset = 0;
    for (const elt of pd.elements) {
      const slice = dataLines.slice(offset, offset + elt.count).join('\n');
      (elt as any)._read(Buffer.from(slice, 'utf8'), true, pd.byteOrder, undefined, {});
      offset += elt.count;
    }
  } else {
    throw new Error('binary header detected; use readBinaryPly');
  }

  return pd;
}

export async function readPly(lines: AsyncIterable<string> | Iterable<string>): Promise<PlyData> {
  if ((lines as AsyncIterable<string>)[Symbol.asyncIterator]) {
    const arr: string[] = [];
    for await (const l of lines as AsyncIterable<string>) arr.push(l);
    return readPlyFromLines(arr);
  }
  return readPlyFromLines(lines as Iterable<string>);
}

export async function writePly(writer: { write: (chunk: string) => any }, ply: PlyData): Promise<void> {
  // write header
  const header = ply.header + '\n';
  await writer.write(header);

  for (const elt of ply.elements) {
    const outChunks: Array<string> = [];
    (elt as any)._write({ push: (b: Buffer | string) => { outChunks.push(typeof b === 'string' ? b : b.toString('utf8')); } }, ply.text, ply.byteOrder);
    for (const c of outChunks) {
      await writer.write(c);
    }
  }
}
