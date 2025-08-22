/*
* This file is part of python-plyfile (original work Copyright © 2014-2025
Darsh Ranjan
* and plyfile authors). TypeScript port © 2025 Gustavo Diogo Silva (GitHub:
GustavoDiogo).
*
* This program is free software: you can redistribute it and/or modify it
under the
* terms of the GNU General Public License as published by the Free Software
* Foundation, either version 3 of the License, or (at your option) any later
version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License along
with this
* program. If not, see <http://www.gnu.org/licenses/>.
*/
import { PlyElement } from './element';
import { PlyHeaderLines, PlyHeaderParser } from './header';
import { byteOrderMap, byteOrderReverse, nativeByteOrder } from './utils';
import { ByteOrder, ReadOptions, WriteOptions } from './types';
import fs from 'fs';

export class PlyData implements Iterable<PlyElement> {
  private _elements: PlyElement[] = [];
  private _elementLookup = new Map<string, PlyElement>();
  private _comments: string[] = [];
  private _objInfo: string[] = [];
  private _text = false;
  private _byteOrder: ByteOrder = '=';

  constructor(elements: PlyElement[] = [], text = false, byteOrder: ByteOrder = '=', comments: string[] = [], objInfo: string[] = []) {
    this._byteOrder = byteOrder; this._text = text; this.comments = comments; this.objInfo = objInfo; this.elements = elements;
  }

  get elements() { return this._elements; }
  set elements(v: PlyElement[]) { this._elements = [...v]; this._index(); }

  get text() { return this._text; }
  set text(v: boolean) { this._text = v; }

  get byteOrder(): ByteOrder { return (!this._text && this._byteOrder === '=') ? nativeByteOrder : this._byteOrder; }
  set byteOrder(v: ByteOrder) {
    if (!['<', '>', '='].includes(v)) throw new Error("byte order must be '<', '>', or '='");
    this._byteOrder = v;
  }

  get comments() { return [...this._comments]; }
  set comments(v: string[]) { this._comments = [...v]; }

  get objInfo() { return [...this._objInfo]; }
  set objInfo(v: string[]) { this._objInfo = [...v]; }

  private _index() {
    this._elementLookup = new Map(this._elements.map(e => [e.name, e]));
    if (this._elementLookup.size !== this._elements.length) throw new Error('two elements with same name');
  }

  static _parseHeader(stream: fs.ReadStream): PlyData {
    const parser = new PlyHeaderParser(new PlyHeaderLines(stream));
    const elements = parser.elements.map(e => new PlyElement(e.name, e.properties, e.count, e.comments));
    const pd = new PlyData(elements, parser.format === 'ascii', byteOrderMap[parser.format!], parser.comments, parser.objInfo);
    return pd;
  }

  static read(pathOrStream: string | fs.ReadStream, opts: ReadOptions = {}): PlyData {
    const mustClose = typeof pathOrStream === 'string';
    const stream = typeof pathOrStream === 'string' ? fs.createReadStream(pathOrStream) : pathOrStream;

    try {
      // Read entire header and then the remaining bytes (payload) for each element.
      const headerParsed = PlyData._parseHeader(stream as fs.ReadStream);
      const chunks: Buffer[] = [];
      // after header parser returns, the underlying stream sits at first data byte
      stream.on('data', (c: Buffer | string) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
      // NOTE: in synchronous style, we need to block; but Node streams are async.
      // For simplicity in this port, we read the rest synchronously via fs.readFileSync when given a path.
      if (typeof pathOrStream === 'string') {
        const file = fs.readFileSync(pathOrStream);
        // Find the end of header by searching for '\nend_header' and next newline
        const ascii = file.toString('ascii');
        const idx = ascii.indexOf('\nend_header');
        const headerEnd = ascii.indexOf('\n', idx + 1) + 1; // include trailing NL
        const dataBuf = file.subarray(headerEnd);
        for (const elt of headerParsed) {
          if (headerParsed.text) {
            // Take first 'count' lines as ASCII rows for this element
            const s = dataBuf.toString('utf8');
            // The element reader will slice internally
            (elt as any)._read(Buffer.from(s, 'utf8'), true, headerParsed.byteOrder, opts.mmap, opts.knownListLen?.[elt.name] || {});
          } else {
            (elt as any)._read(dataBuf, false, headerParsed.byteOrder, opts.mmap, opts.knownListLen?.[elt.name] || {});
          }
        }
      } else {
        throw new Error('Readable stream version of read() not implemented in this minimal port. Provide a filename path.');
      }
      return headerParsed;
    } finally {
      if (mustClose && typeof pathOrStream === 'string') {
        // FS readFileSync closed handle automatically; nothing to do
      }
    }
  }

  write(pathOrStream: string | fs.WriteStream, _opts: WriteOptions = {}): void {
    const text = this._text;
    const binaryStream = typeof pathOrStream !== 'string' ? (pathOrStream as fs.WriteStream) : fs.createWriteStream(pathOrStream);

    const header = this.header;
    const outChunks: Array<Buffer | string> = [];
    if (text) outChunks.push(header + '\n'); else outChunks.push(Buffer.from(header + '\n', 'ascii'));

    for (const elt of this._elements) {
      (elt as any)._write({ push: (b: Buffer | string) => outChunks.push(b) }, text, this.byteOrder);
    }

    for (const c of outChunks) binaryStream.write(c as any);
    if (typeof pathOrStream === 'string') binaryStream.end();
  }

  get header(): string {
    const lines = ['ply'];
    if (this._text) lines.push('format ascii 1.0');
    else lines.push(`format ${byteOrderReverse[this.byteOrder]} 1.0`);
    for (const c of this._comments) lines.push('comment ' + c);
    for (const c of this._objInfo) lines.push('obj_info ' + c);
    for (const e of this._elements) lines.push(e.header());
    lines.push('end_header');
    return lines.join('\n');
  }

  [Symbol.iterator](): Iterator<PlyElement> { return this._elements[Symbol.iterator](); }
  get length() { return this._elements.length; }
  has(name: string) { return this._elementLookup.has(name); }
  get(name: string) { const e = this._elementLookup.get(name); if (!e) throw new Error('KeyError'); return e; }

  toString() { return this.header; }
}