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
import { byteOrderMap, byteOrderReverse } from './utils';
import { PlyHeaderParseError } from './errors';
import { PlyListProperty, PlyProperty } from './property';

export interface ParsedElement { name: string; comments: string[]; count: number; properties: (PlyProperty | PlyListProperty)[]; }

export class PlyHeaderParser {
  format: string | null = null; // 'ascii' | 'binary_little_endian' | 'binary_big_endian'
  elements: ParsedElement[] = [];
  comments: string[] = [];
  objInfo: string[] = [];
  lines = 1;
  private _allowed: string[] = ['format', 'comment', 'obj_info'];

  constructor(lines: Iterable<string>) {
    for (const line of lines) this.consume(line);
    if (this._allowed.length) this._error('early end-of-file');
  }

  consume(rawLine: string): string[] {
    this.lines += 1;
    if (!rawLine) this._error('early end-of-file');
    const line = rawLine.trim();
    const parts = line.split(/\s+/, 1);
    const keyword = parts[0] || '';
    if (!this._allowed.includes(keyword)) this._error(`expected one of {${this._allowed.join(', ')}}`);
    const rest = line.slice(keyword.length).trimStart();
    (this as any)[`parse_${keyword}`](rest);
    return this._allowed;
  }

  private _error(message = 'parse error'): never {
    throw new PlyHeaderParseError(message, this.lines);
  }

  parse_format(data: string) {
    const fields = data.trim().split(/\s+/);
    if (fields.length !== 2) this._error('expected "format {format} 1.0"');
    const fmt = fields[0];
    if (!(fmt in byteOrderMap)) this._error(`don't understand format '${fmt}'`);
    if (fields[1] !== '1.0') this._error("expected version '1.0'");
    this.format = fmt;
    this._allowed = ['element', 'comment', 'obj_info', 'end_header'];
  }

  parse_comment(data: string) {
    if (!this.elements.length) this.comments.push(data); else this.elements[this.elements.length - 1].comments.push(data);
  }

  parse_obj_info(data: string) { this.objInfo.push(data); }

  parse_element(data: string) {
    const fields = data.trim().split(/\s+/);
    if (fields.length !== 2) this._error('expected "element {name} {count}"');
    const name = fields[0];
    const count = Number(fields[1]);
    if (!Number.isInteger(count)) this._error('expected integer count');
    this.elements.push({ name, comments: [], count, properties: [] });
    this._allowed = ['element', 'comment', 'property', 'end_header'];
  }

  parse_property(data: string) {
    const tgt = this.elements[this.elements.length - 1];
    const fields = data.trim().split(/\s+/);
    if (fields.length < 2) this._error("bad 'property' line");
    if (fields[0] === 'list') {
      if (fields.length !== 4) this._error("expected \"property list {len_type} {val_type} {name}\"");
      tgt.properties.push(new PlyListProperty(fields[3], fields[1], fields[2]));
    } else {
      if (fields.length !== 2) this._error("expected \"property {type} {name}\"");
      tgt.properties.push(new PlyProperty(fields[1], fields[0]));
    }
  }

  parse_end_header(data: string) {
    if (data) this._error("unexpected data after 'end_header'");
    this._allowed = [];
  }
}

export class PlyHeaderLines implements Iterable<string> {
  private chars: string[] = [];
  private nl = '';
  private lenNl = 0;
  private done = false;
  private lineNo = 1;

  constructor(private stream: { read: (n: number) => Buffer | string }) {
    const s = this.decode(this.stream.read(4));
    if (s.slice(0, 3) !== 'ply') throw new PlyHeaderParseError("expected 'ply'", 1);
    this.nl = s.slice(3);
    if (this.nl === '\r') {
      const c = this.decode(this.stream.read(1));
      if (c === '\n') this.nl += c; else this.chars.push(c);
    } else if (this.nl !== '\n') {
      throw new PlyHeaderParseError("unexpected characters after 'ply'", 1);
    }
    this.lenNl = this.nl.length;
  }

  private decode(x: Buffer | string | null | undefined): string {
    if (x === null || x === undefined) return '';
    return typeof x === 'string' ? x : x.toString('ascii');
  }

  *[Symbol.iterator](): Iterator<string> {
    while (!this.done) {
      this.lineNo += 1;
      while (this.chars.slice(-this.lenNl).join('') !== this.nl) {
        const next = this.decode(this.stream.read(1));
        if (!next) throw new PlyHeaderParseError('early end-of-file', this.lineNo);
        this.chars.push(next);
      }
      const line = this.chars.slice(0, -this.lenNl).join('');
      this.chars = [];
      if (line === 'end_header') this.done = true;
      yield line;
    }
  }
}