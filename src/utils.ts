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
  // If the user provided a long name (e.g. 'float'), map to the short canonical code ('f4').
  if (typeStr in dataTypes) return dataTypes[typeStr];
  // If the user already provided a short code ('f4','i4', etc), accept it as-is.
  if (typeStr in dataTypeReverse) return typeStr;
  throw new Error(`field type '${typeStr}' not in ${JSON.stringify(typesList)}`);
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
  // Use Buffer read helpers to avoid DataView/ArrayBuffer offset pitfalls.
  // accept both short codes ('f4') and long names ('float')
  if (!(type in dataTypeReverse) && (type in dataTypes)) {
    type = dataTypes[type];
  }
  const little = order === '<' || (order === '=' && nativeByteOrder === '<');
  if (process.env.PLY_DEBUG === '1') {
    // eslint-disable-next-line no-console
    console.error(`readArray: type=${type} offset=${offset} count=${count} bufLen=${view.length} order=${order}`);
  }
  const out: number[] = [];
  const sizes: Record<string, number> = { i1: 1, u1: 1, i2: 2, u2: 2, i4: 4, u4: 4, f4: 4, f8: 8 };
  let pos = offset;
  for (let i = 0; i < count; i++) {
  switch (type) {
      case 'i1':
        if (pos + 1 > view.length) throw new Error('StopIteration');
        out.push(view.readInt8(pos)); pos += 1; break;
      case 'u1':
        if (pos + 1 > view.length) throw new Error('StopIteration');
        out.push(view.readUInt8(pos)); pos += 1; break;
      case 'i2':
        if (pos + 2 > view.length) throw new Error('StopIteration');
        out.push(little ? view.readInt16LE(pos) : view.readInt16BE(pos)); pos += 2; break;
      case 'u2':
        if (pos + 2 > view.length) throw new Error('StopIteration');
        out.push(little ? view.readUInt16LE(pos) : view.readUInt16BE(pos)); pos += 2; break;
      case 'i4':
        if (pos + 4 > view.length) throw new Error('StopIteration');
        out.push(little ? view.readInt32LE(pos) : view.readInt32BE(pos)); pos += 4; break;
      case 'u4':
        if (pos + 4 > view.length) throw new Error('StopIteration');
        out.push(little ? view.readUInt32LE(pos) : view.readUInt32BE(pos)); pos += 4; break;
      case 'f4':
        if (pos + 4 > view.length) throw new Error('StopIteration');
        out.push(little ? view.readFloatLE(pos) : view.readFloatBE(pos)); pos += 4; break;
      case 'f8':
        if (pos + 8 > view.length) {
          if (process.env.PLY_DEBUG === '1') console.error(`readArray: early EOF when reading f8 at pos=${pos} bufLen=${view.length}`);
          throw new Error('StopIteration');
        }
        out.push(little ? view.readDoubleLE(pos) : view.readDoubleBE(pos)); pos += 8; break;
      default: throw new Error(`unsupported dtype '${type}'`);
    }
  }
  return { values: out, next: pos };
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