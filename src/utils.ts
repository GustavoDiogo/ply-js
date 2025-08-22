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
import os from 'os';
import { ByteOrder } from './types';
import { PlyHeaderParseError } from './errors';

export const nativeByteOrder: ByteOrder = os.endianness() === 'LE' ? '<' : '>';

export const byteOrderMap: Record<string, ByteOrder> = {
  ascii: '=',
  binary_little_endian: '<',
  binary_big_endian: '>',
};

export const byteOrderReverse: Record<'<' | '>' | '=', string> = {
  '<': 'binary_little_endian',
  '>': 'binary_big_endian',
  '=': 'ascii', // only used when formatting text header
};

// Many-to-many mapping preserved from original
export const dataTypeRelation: Array<[string, string]> = [
  ['int8', 'i1'],
  ['char', 'i1'],
  ['uint8', 'u1'],
  ['uchar', 'b1'],
  ['uchar', 'u1'],
  ['int16', 'i2'],
  ['short', 'i2'],
  ['uint16', 'u2'],
  ['ushort', 'u2'],
  ['int32', 'i4'],
  ['int', 'i4'],
  ['uint32', 'u4'],
  ['uint', 'u4'],
  ['float32', 'f4'],
  ['float', 'f4'],
  ['float64', 'f8'],
  ['double', 'f8'],
];

export const dataTypes: Record<string, string> = Object.fromEntries(dataTypeRelation);
export const dataTypeReverse: Record<string, string> = Object.fromEntries(
  dataTypeRelation.map(([a, b]) => [b, a])
);

export const typesList: string[] = (() => {
  const set = new Set<string>();
  const list: string[] = [];
  for (const [a, b] of dataTypeRelation) {
    if (!set.has(a)) {
      list.push(a);
      set.add(a);
    }
    if (!set.has(b)) {
      list.push(b);
      set.add(b);
    }
  }
  return list;
})();

export function lookupType(typeStr: string): string {
  if (!(typeStr in dataTypeReverse)) {
    const mapped = dataTypes[typeStr];
    if (!mapped) {
      throw new Error(`field type '${typeStr}' not in ${JSON.stringify(typesList)}`);
    }
    return dataTypeReverse[mapped];
  }
  return dataTypeReverse[typeStr];
}

export function checkName(name: string): void {
  for (const ch of name) {
    const code = ch.charCodeAt(0);
    if (!(0 <= code && code < 128)) throw new Error(`non-ASCII character in name '${name}'`);
    if (/\s/.test(ch)) throw new Error(`space character(s) in name '${name}'`);
  }
}

export function checkComments(comments: string[]): void {
  for (const c of comments) {
    for (const ch of c) {
      const code = ch.charCodeAt(0);
      if (!(0 <= code && code < 128)) throw new Error('non-ASCII character in comment');
      if (ch === '\n') throw new Error('embedded newline in comment');
    }
  }
}

export function decodeAscii(bufOrStr: Buffer | string): string {
  return typeof bufOrStr === 'string' ? bufOrStr : bufOrStr.toString('ascii');
}

export function readArray(view: Buffer, offset: number, count: number, type: string, order: ByteOrder): { values: number[]; next: number } {
  const dv = new DataView(view.buffer, view.byteOffset + offset, view.length - offset);
  const little = order === '<' || (order === '=' && nativeByteOrder === '<');
  let pos = 0;
  const out: number[] = [];
  const advance = (n: number) => { pos += n; };
  const getter = (code: string) => {
    switch (code) {
      case 'i1': return () => (dv.getInt8(pos) as number); // 1
      case 'u1': return () => (dv.getUint8(pos) as number);
      case 'i2': return () => (dv.getInt16(pos, little) as number);
      case 'u2': return () => (dv.getUint16(pos, little) as number);
      case 'i4': return () => (dv.getInt32(pos, little) as number);
      case 'u4': return () => (dv.getUint32(pos, little) as number);
      case 'f4': return () => (dv.getFloat32(pos, little) as number);
      case 'f8': return () => (dv.getFloat64(pos, little) as number);
      default: throw new Error(`unsupported dtype '${code}'`);
    }
  };
  const sizes: Record<string, number> = { i1: 1, u1: 1, i2: 2, u2: 2, i4: 4, u4: 4, f4: 4, f8: 8 };
  const get = getter(type);
  for (let i = 0; i < count; i++) {
    out.push(get());
    advance(sizes[type]);
  }
  return { values: out, next: offset + pos };
}

export function writeArray(values: number[], type: string, order: ByteOrder): Buffer {
  const sizes: Record<string, number> = { i1: 1, u1: 1, i2: 2, u2: 2, i4: 4, u4: 4, f4: 4, f8: 8 };
  const size = values.length * sizes[type];
  const buf = Buffer.allocUnsafe(size);
  const dv = new DataView(buf.buffer, buf.byteOffset, size);
  const little = order === '<' || (order === '=' && nativeByteOrder === '<');
  let pos = 0;
  const put = (code: string, v: number) => {
    switch (code) {
      case 'i1': dv.setInt8(pos, v); break;
      case 'u1': dv.setUint8(pos, v); break;
      case 'i2': dv.setInt16(pos, v, little); break;
      case 'u2': dv.setUint16(pos, v, little); break;
      case 'i4': dv.setInt32(pos, v, little); break;
      case 'u4': dv.setUint32(pos, v, little); break;
      case 'f4': dv.setFloat32(pos, v, little); break;
      case 'f8': dv.setFloat64(pos, v, little); break;
      default: throw new Error(`unsupported dtype '${code}'`);
    }
    pos += sizes[code];
  };
  for (const v of values) put(type, v);
  return buf;
}

export function normalizeByteOrder(text: boolean, bo: ByteOrder): ByteOrder {
  if (!text && bo === '=') return nativeByteOrder;
  return bo;
}

export function expect(cond: any, message: string, line?: number): asserts cond {
  if (!cond) throw new PlyHeaderParseError(message, line);
}