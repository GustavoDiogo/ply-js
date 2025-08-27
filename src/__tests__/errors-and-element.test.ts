import { PlyHeaderParseError, PlyElementParseError } from '../errors';
import { PlyElement } from '../element';
import { PlyProperty, PlyListProperty } from '../property';

describe('error classes formatting', () => {
  test('PlyHeaderParseError exposes line and message', () => {
    const e = new PlyHeaderParseError('bad header', 3);
    expect(e.line).toBe(3);
    expect(e.message).toBe('bad header');
  });

  test('PlyElementParseError exposes element/row/prop and message', () => {
    const e = new PlyElementParseError('oops', { name: 'vertex' }, 2, { name: 'x' });
    expect(e.element && e.element.name).toBe('vertex');
    expect(e.row).toBe(2);
    expect(e.prop && e.prop.name).toBe('x');
    expect(e.message).toBe('oops');
  });
});

describe('PlyElement text parsing errors', () => {
  test('early EOF in _readTxt', () => {
    const props = [new PlyProperty('x', 'float'), new PlyProperty('y', 'float')];
    const el = new PlyElement('vertex', props, 3);
  // only two lines instead of three; use public _read with isText=true
  expect(() => el._read(Buffer.from('0 1\n2 3\n'), true as any, '=')).toThrow(PlyElementParseError);
  });

  test('early end-of-line and malformed input', () => {
    const props = [new PlyProperty('x', 'float'), new PlyProperty('y', 'float')];
    const el = new PlyElement('vertex', props, 1);
    // missing one value triggers early end-of-line
  expect(() => el._read(Buffer.from('1\n'), true as any, '=')).toThrow(/early end-of-line/);
  // malformed non-numeric triggers malformed input
  expect(() => el._read(Buffer.from('a b\n'), true as any, '=')).toThrow(/malformed input/);
  });

  test('expected end-of-line when extra tokens', () => {
    const props = [new PlyProperty('x', 'float')];
    const el = new PlyElement('vertex', props, 1);
  expect(() => el._read(Buffer.from('1 2\n'), true as any, '=')).toThrow(/expected end-of-line/);
  });
});
