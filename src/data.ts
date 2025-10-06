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
    try {
      if (typeof pathOrStream === 'string') {
        const file = fs.readFileSync(pathOrStream);

        // buffer-backed reader that tracks offset consumed by PlyHeaderLines
        let offset = 0;
        const rawReader = { read(n: number): Buffer | null {
          if (offset >= file.length) return null;
          const end = Math.min(offset + n, file.length);
          const chunk = file.slice(offset, end);
          offset = end;
          return chunk;
        } };

        // PlyHeaderLines expects a reader returning string|Buffer; adapter converts null->''
        const reader = { read(n: number): Buffer | string { const r = rawReader.read(n); return r === null ? '' : r; } };

        // Use PlyHeaderLines against our buffer reader to reliably parse header
        const headerLines: string[] = [];
        for (const line of new PlyHeaderLines(reader)) headerLines.push(line);
        const parser = new PlyHeaderParser(headerLines);

  const elements = parser.elements.map(e => new PlyElement(e.name, e.properties, e.count, e.comments));
  const headerParsed = new PlyData(elements, parser.format === 'ascii', byteOrderMap[parser.format!], parser.comments, parser.objInfo);

  const dataBuf = file.subarray(offset);

        if (headerParsed.text) {
          const s = dataBuf.toString('utf8');
          const lines = s.split(/\r?\n/).filter(Boolean);
          let lineCursor = 0;
          for (const elt of headerParsed) {
            const need = elt.count;
            const slice = lines.slice(lineCursor, lineCursor + need).join('\n') + '\n';
            (elt as any)._read(Buffer.from(slice, 'utf8'), true, headerParsed.byteOrder, opts.mmap, opts.knownListLen?.[elt.name] || {});
            lineCursor += need;
          }
        } else {
          let cursor = 0;
          for (const elt of headerParsed) {
            const bufSlice = dataBuf.subarray(cursor);
            const consumed = (elt as any)._read(bufSlice, false, headerParsed.byteOrder, opts.mmap, opts.knownListLen?.[elt.name] || {});
            if (typeof consumed !== 'number') throw new Error(`element ${elt.name} did not return consumed byte count`);
            cursor += consumed;
          }
        }

        return headerParsed;
      }
      throw new Error('Readable stream version of read() not implemented in this minimal port. Provide a filename path.');
    } finally {
      // nothing to close for readFileSync
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