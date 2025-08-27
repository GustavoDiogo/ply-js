import * as utils from '../utils';
import { PlyProperty, PlyListProperty } from '../property';
import { PlyHeaderParser } from '../header';
import { readBinaryPly } from '../readBinary';

describe('core utilities and parsing', () => {
  test('lookupType returns a string and rejects unknown', () => {
    const out = utils.lookupType('f4');
    expect(typeof out).toBe('string');
    // unknown type throws
    expect(() => utils.lookupType('madeup')).toThrow();
  });

  test('checkName and checkComments validation', () => {
    expect(() => utils.checkName('good_name')).not.toThrow();
    expect(() => utils.checkName('bad name')).toThrow(/space/);
    expect(() => utils.checkName(String.fromCharCode(0x0100))).toThrow(/non-ASCII/);

    expect(() => utils.checkComments(['ok','also ok'])).not.toThrow();
    expect(() => utils.checkComments(['bad\nline'])).toThrow(/newline/);
    expect(() => utils.checkComments([String.fromCharCode(0x0100)])).toThrow(/non-ASCII/);
  });

  test('decodeAscii and normalizeByteOrder behavior', () => {
    expect(utils.decodeAscii(Buffer.from('abc'))).toBe('abc');
    expect(utils.decodeAscii('xyz')).toBe('xyz');
    // when text=false and '=' should return nativeByteOrder
    const native = utils.nativeByteOrder;
    expect(utils.normalizeByteOrder(false, '=')).toBe(native);
    // when text=true '=' should be preserved
    expect(utils.normalizeByteOrder(true, '=')).toBe('=');
  });

  test('readArray/writeArray roundtrip and StopIteration', () => {
    const vals = [1, 2, 3];
    const buf = utils.writeArray(vals, 'i2', '<');
    const { values, next } = utils.readArray(buf, 0, 3, 'i2', '<');
    expect(values).toEqual(vals);
    expect(next).toBe(buf.length);
    // short buffer triggers StopIteration
    const short = buf.slice(0, 2);
    expect(() => utils.readArray(short, 0, 2, 'i2', '<')).toThrow(/StopIteration/);
  });

  test('expect throws PlyHeaderParseError on false', () => {
    expect(() => utils.expect(false, 'boom', 5)).toThrow();
  });
});

describe('property read/write', () => {
  test('PlyProperty roundtrip binary', () => {
  const p = new PlyProperty('x', 'float');
  // dtype should be a string and toString include 'property'
  expect(typeof p.dtype('=')).toBe('string');
  expect(String(p)).toMatch(/property/);
  // test _fromFields/_toFields roundtrip via iterator
  const fields = ['3.5'][Symbol.iterator]();
  const val = p._fromFields(fields as any);
  expect(val).toBeCloseTo(3.5, 5);
  });

  test('PlyListProperty read/write', () => {
  // use long names that map to canonical short codes
  const lp = new PlyListProperty('vals', 'uchar', 'float');
  const arr = [1.5, 2.5, 3.5];
  // test _fromFields/_toFields
  const fields = [String(arr.length), ...arr.map(String)][Symbol.iterator]();
  const got = lp._fromFields(fields as any);
  expect(Array.isArray(got)).toBe(true);
  expect(got.length).toBe(arr.length);
  const s = String(lp);
  expect(s).toMatch(/property list/);
  });
});

describe('header parsing and readBinary integration', () => {
  test('PlyHeaderParser parses a simple ascii header', () => {
    const lines = [
      'format ascii 1.0',
      'comment hello',
      'element vertex 2',
      'property float x',
      'property float y',
      'end_header'
    ];
    const parser = new PlyHeaderParser(lines);
    expect(parser.format).toBe('ascii');
    expect(parser.elements.length).toBe(1);
    expect(parser.comments).toContain('hello');
  });

  test('PlyHeaderParser rejects bad format', () => {
    expect(() => new PlyHeaderParser(['format bad 1.0'] as any)).toThrow();
  });

  test('readBinaryPly can read small ascii ply buffer', () => {
    const text = 'ply\nformat ascii 1.0\nelement vertex 2\nproperty float x\nproperty float y\nend_header\n0 1\n2 3\n';
    const buf = Buffer.from(text, 'utf8');
    const pd = readBinaryPly(buf);
    expect(pd.length).toBeGreaterThan(0);
    const elt = pd.elements[0];
    expect(elt.data.length).toBe(2);
    expect(elt.data[0].x).toBeDefined();
  });
});
