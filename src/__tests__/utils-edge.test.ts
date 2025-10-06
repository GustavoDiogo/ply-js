import * as utils from '../utils';
import { PlyListProperty } from '../property';
import { PlyElement } from '../element';
import { PlyProperty } from '../property';
import { PlyElementParseError } from '../errors';

describe('utils edge cases', () => {
  test('lookupType maps long names to short codes (returns string)', () => {
    expect(typeof utils.lookupType('float')).toBe('string');
    expect(typeof utils.lookupType('int32')).toBe('string');
  });

  test('readArray throws StopIteration on truncated f8', () => {
    const buf = Buffer.allocUnsafe(7);
    expect(() => utils.readArray(buf, 0, 1, 'f8', '<')).toThrow(/StopIteration/);
  });

  test('writeArray unknown dtype throws', () => {
    expect(() => utils.writeArray([1, 2], 'zzz' as any, '<')).toThrow();
  });
});

describe('binary element and list errors', () => {
  test('PlyElement._read throws on early EOF in binary', () => {
    const props = [new PlyProperty('x', 'float'), new PlyProperty('y', 'float')];
    const el = new PlyElement('vertex', props, 2);
    // only 8 bytes provided, needs 16
    const buf = Buffer.allocUnsafe(8);
    expect(() => el._read(buf, false, '<')).toThrow(PlyElementParseError);
  });

  test('PlyListProperty._readBin throws on short buffer', () => {
    const lp = new PlyListProperty('vals', 'uchar', 'float');
    const short = Buffer.allocUnsafe(0);
    expect(() => lp._readBin(short, 0, '<')).toThrow();
  });
});
