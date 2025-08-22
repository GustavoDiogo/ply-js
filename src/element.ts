import { PlyListProperty, PlyProperty } from './property';
import { PlyElementParseError } from './errors';
import { ByteOrder, PlyList, PlyRecord, PlyScalar } from './types';
import { readArray, writeArray, normalizeByteOrder } from './utils';

export class PlyElement {
  private _name: string;
  private _count: number;
  private _properties: Array<PlyProperty | PlyListProperty>;
  private _propertyLookup: Map<string, PlyProperty | PlyListProperty> = new Map();
  private _comments: string[] = [];
  private _haveList: boolean;

  data: PlyRecord[] = [];

  constructor(name: string, properties: Array<PlyProperty | PlyListProperty>, count: number, comments: string[] = []) {
    this._name = String(name);
    this._properties = [...properties];
    this._count = count;
    this.comments = comments;
    this._index();
    this._haveList = this._properties.some(p => p instanceof PlyListProperty);
  }

  get name() { return this._name; }
  get count() { return this._count; }
  get properties() { return this._properties; }

  set dataArray(rows: PlyRecord[]) { this.data = rows; this._count = rows.length; this._checkSanity(); }

  get comments() { return [...this._comments]; }
  set comments(c: string[]) { this._comments = [...c]; }

  private _index() {
    this._propertyLookup = new Map(this._properties.map(p => [p.name, p]));
    if (this._propertyLookup.size !== this._properties.length) throw new Error('two properties with same name');
  }

  private _checkSanity() {
    for (const prop of this._properties) {
      for (const rec of this.data) {
        if (!(prop.name in rec)) throw new Error(`dangling property '${prop.name}'`);
      }
    }
  }

  plyProperty(name: string) { return this._propertyLookup.get(name)!; }

  dtype(byteOrder: ByteOrder = '='): Array<[string, string]> {
    // TS version: return tuple list; consumers can map as needed
    return this._properties.map(p => [p.name, p.dtype(byteOrder)]);
  }

  header(): string {
    const lines = [`element ${this.name} ${this.count}`];
    for (const c of this._comments) lines.push(`comment ${c}`);
    for (const p of this._properties) lines.push(String(p));
    return lines.join('\n');
  }

  _read(stream: Buffer, isText: boolean, byteOrder: ByteOrder, _mmap?: any, knownListLen: Record<string, number> = {}) {
    if (isText) return this._readTxt(stream.toString('utf8'));
    return this._readBin(stream, byteOrder);
  }

  private _readTxt(text: string) {
    const lines = text.split(/\r?\n/).filter(Boolean).slice(0, this.count);
    if (lines.length < this.count) throw new PlyElementParseError('early end-of-file', this, lines.length);
    this.data = new Array(this.count);
    for (let k = 0; k < this.count; k++) {
      const parts = lines[k].trim().split(/\s+/);
      const it = parts[Symbol.iterator]();
      const rec: PlyRecord = {};
      for (const prop of this._properties) {
        try {
          const v = (prop as any)._fromFields(it);
          rec[prop.name] = v as any;
        } catch (e: any) {
          if (e?.message === 'StopIteration') throw new PlyElementParseError('early end-of-line', this, k, prop as any);
          if (e?.message === 'ValueError') throw new PlyElementParseError('malformed input', this, k, prop as any);
          throw e;
        }
      }
      // Ensure no extra tokens
      if (!it.next().done) throw new PlyElementParseError('expected end-of-line', this, k);
      this.data[k] = rec;
    }
  }

  private _readBin(buffer: Buffer, byteOrder: ByteOrder) {
    const bo = normalizeByteOrder(false, byteOrder);
    let offset = 0;
    this.data = new Array(this.count);
    for (let k = 0; k < this.count; k++) {
      const rec: PlyRecord = {};
      for (const prop of this._properties) {
        if (prop instanceof PlyListProperty) {
          try {
            const { value, next } = prop._readBin(buffer, offset, bo);
            offset = next; rec[prop.name] = value;
          } catch {
            throw new PlyElementParseError('early end-of-file', this, k, prop);
          }
        } else {
          try {
            const { value, next } = (prop as PlyProperty)._readBin(buffer, offset, bo);
            offset = next; rec[prop.name] = value;
          } catch {
            throw new PlyElementParseError('early end-of-file', this, k, prop as any);
          }
        }
      }
      this.data[k] = rec;
    }
  }

  _write(streams: { push: (buf: Buffer | string) => void }, isText: boolean, byteOrder: ByteOrder) {
    if (isText) return this._writeTxt(streams);
    return this._writeBin(streams, byteOrder);
  }

  private _writeTxt(out: { push: (buf: Buffer | string) => void }) {
    for (const rec of this.data) {
      const fields: number[] = [];
      for (const prop of this._properties) {
        for (const v of (prop as any)._toFields(rec[prop.name] as any)) fields.push(Number(v));
      }
      out.push(fields.join(' ') + '\n');
    }
  }

  private _writeBin(out: { push: (buf: Buffer | string) => void }, byteOrder: ByteOrder) {
    for (const rec of this.data) {
      for (const prop of this._properties) {
        const data = rec[prop.name] as any;
        const buf = (prop as any)._writeBin(data, byteOrder) as Buffer;
        out.push(buf);
      }
    }
  }
}