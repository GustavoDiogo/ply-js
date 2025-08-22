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
import { lookupType, dataTypeReverse } from './utils';
import { ByteOrder, PlyList, PlyScalar } from './types';
import { readArray, writeArray, nativeByteOrder } from './utils';

export class PlyProperty {
  private _name: string;
  private _valDtypeCode!: string; // canonical i1/u1/i2/.../f8

  constructor(name: string, valDtype: string) {
    this._name = String(name);
    this.valDtype = valDtype;
  }

  get name() { return this._name; }

  get valDtype() { return this._valDtypeCode; }
  set valDtype(val: string) { this._valDtypeCode = lookupType(val); }

  dtype(byteOrder: ByteOrder = '='): string {
    return `${byteOrder}${this._valDtypeCode}`; // keep Python-esque flavor
  }

  _fromFields(fields: Iterator<string>): PlyScalar | PlyList {
    const next = fields.next();
    if (next.done) throw new Error('StopIteration');
    const value = Number(next.value);
    if (Number.isNaN(value)) throw new Error('ValueError');
    return value as PlyScalar;
  }

  *_toFields(value: any): Iterable<number> {
    yield value as unknown as number;
  }

  _readBin(view: Buffer, offset: number, byteOrder: ByteOrder): { value: PlyScalar | PlyList; next: number } {
    const code = this._valDtypeCode;
    const { values, next } = readArray(view, offset, 1, code, byteOrder);
    if (values.length < 1) throw new Error('StopIteration');
    return { value: values[0] as PlyScalar, next };
  }

  _writeBin(value: PlyScalar, byteOrder: ByteOrder): Buffer {
    return writeArray([value as unknown as number], this._valDtypeCode, byteOrder);
  }

  toString(): string {
    const valStr = dataTypeReverse[this._valDtypeCode];
    return `property ${valStr} ${this.name}`;
  }
}

export class PlyListProperty extends PlyProperty {
  private _lenDtypeCode!: string;

  constructor(name: string, lenDtype: string, valDtype: string) {
    super(name, valDtype);
    this.lenDtype = lenDtype;
  }

  get lenDtype() { return this._lenDtypeCode; }
  set lenDtype(v: string) { this._lenDtypeCode = lookupType(v); }

  // For parity: list dtype for field storage is always object/variant in JS
  dtype(): string { return '|O'; }

  listDtype(byteOrder: ByteOrder = '='): [string, string] {
    const bo = byteOrder === '=' ? nativeByteOrder : byteOrder;
    return [`${bo}${this._lenDtypeCode}`, `${bo}${this.valDtype}`];
  }

  override _fromFields(fields: Iterator<string>): PlyList {
    const first = fields.next();
    if (first.done) throw new Error('StopIteration');
    const n = Number(first.value);
    if (!Number.isFinite(n)) throw new Error('ValueError');
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const item = fields.next();
      if (item.done) throw new Error('StopIteration');
      const v = Number(item.value);
      if (Number.isNaN(v)) throw new Error('ValueError');
      out.push(v);
    }
    return out;
  }

  override *_toFields(value: any): Iterable<number> {
    yield value.length;
    for (const v of value) yield v;
  }

  _readListAndAdvance(view: Buffer, offset: number, byteOrder: ByteOrder): { list: number[]; next: number } {
    const [lenCode, valCode] = this.listDtype(byteOrder);
    const lenRead = readArray(view, offset, 1, lenCode.slice(1), byteOrder);
    if (lenRead.values.length < 1) throw new Error('StopIteration');
    const n = lenRead.values[0];
    const valRead = readArray(view, lenRead.next, n, valCode.slice(1), byteOrder);
    if (valRead.values.length < n) throw new Error('StopIteration');
    return { list: valRead.values, next: valRead.next };
  }

  override _readBin(view: Buffer, offset: number, byteOrder: ByteOrder): { value: PlyScalar | PlyList; next: number } {
    const { list, next } = this._readListAndAdvance(view, offset, byteOrder);
    return { value: list, next };
  }

  override _writeBin(value: PlyScalar | PlyList, byteOrder: ByteOrder): Buffer {
    const [lenCode, valCode] = this.listDtype(byteOrder);
    const list = value as PlyList;
    const lenBuf = writeArray([list.length], lenCode.slice(1), byteOrder);
    const valBuf = writeArray(list, valCode.slice(1), byteOrder);
    return Buffer.concat([lenBuf, valBuf]);
  }

  override toString(): string {
    const lenStr = dataTypeReverse[this.lenDtype];
    const valStr = dataTypeReverse[this.valDtype];
    return `property list ${lenStr} ${valStr} ${this.name}`;
  }
}