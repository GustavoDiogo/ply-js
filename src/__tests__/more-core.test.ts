import * as utils from '../utils';
import { PlyProperty, PlyListProperty } from '../property';
import { PlyData } from '../data';
import { readBinaryPly } from '../readBinary';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('utils type roundtrips', () => {
  const types: Array<[string, any]> = [
    ['i1', -5], ['u1', 250], ['i2', -300], ['u2', 60000], ['i4', -70000], ['u4', 3000000000], ['f4', 3.1415], ['f8', 2.718281828459045]
  ];

  test('writeArray/readArray for various types little-endian', () => {
    for (const [t, v] of types) {
      const buf = utils.writeArray([v], t as any, '<');
      const { values } = utils.readArray(buf, 0, 1, t as any, '<');
      expect(values.length).toBe(1);
    }
  });

  test('normalizeByteOrder and byteOrder maps', () => {
    expect(utils.byteOrderMap.binary_little_endian).toBe('<');
    expect(utils.byteOrderReverse['<']).toBe('binary_little_endian');
    expect(utils.normalizeByteOrder(false, '=')).toBe(utils.nativeByteOrder);
  });
});

describe('property dtype/listDtype', () => {
  test('PlyProperty and PlyListProperty dtype helpers', () => {
    const p = new PlyProperty('z', 'float');
    expect(p.dtype('<')).toContain('float');
    const lp = new PlyListProperty('vals', 'uchar', 'float');
    const listD = lp.listDtype('<');
    expect(Array.isArray(listD)).toBe(true);
    expect(listD[0]).toContain('u');
  });
});

describe('PlyData.read from file and readBinaryPly binary', () => {
  test('PlyData.read reads ascii file path', () => {
    const txt = 'ply\nformat ascii 1.0\nelement vertex 1\nproperty float x\nproperty float y\nend_header\n5 6\n';
    const tmp = path.join(os.tmpdir(), `ply-test-${Date.now()}.ply`);
    fs.writeFileSync(tmp, txt, 'utf8');
    const pd = (PlyData as any).read(tmp);
    expect(pd.elements[0].data[0].x).toBe(5);
    fs.unlinkSync(tmp);
  });

  test('readBinaryPly reads binary_little_endian payload', () => {
    // header
    const header = 'ply\nformat binary_little_endian 1.0\nelement vertex 2\nproperty float x\nproperty float y\nend_header\n';
    const payload = Buffer.allocUnsafe(8 * 2);
    payload.writeFloatLE(0, 0);
    payload.writeFloatLE(1, 4);
    payload.writeFloatLE(2, 8);
    payload.writeFloatLE(3, 12);
    const buf = Buffer.concat([Buffer.from(header, 'ascii'), payload]);
    const pd = readBinaryPly(buf);
    expect(pd.elements[0].data.length).toBe(2);
    expect(pd.elements[0].data[0].x).toBeCloseTo(0);
    expect(pd.elements[0].data[1].y).toBeCloseTo(3);
  });
});
