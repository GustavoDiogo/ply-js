import { PlyHeaderLines, PlyHeaderParser } from '../header';
import { PlyHeaderParseError } from '../errors';

function makeStream(s: string) {
  let pos = 0;
  return {
    read: (n: number) => {
      if (pos >= s.length) return '';
      const out = s.slice(pos, pos + n);
      pos += n;
      return out;
    }
  };
}

describe('PlyHeaderLines and parser', () => {
  test('happy path header lines iterator', () => {
    const txt = 'ply\nformat ascii 1.0\nend_header\n';
    const stream = makeStream(txt);
    const lines = new PlyHeaderLines(stream as any);
    const arr = [...lines];
    // should yield format and end_header processed, make parser consume
    const parser = new PlyHeaderParser(arr);
    expect(parser.format).toBe('ascii');
  });

  test('header lines EOF error', () => {
    const txt = 'ply\nformat ascii 1.0\n'; // no end_header
    const stream = makeStream(txt);
    const lines = new PlyHeaderLines(stream as any);
    expect(() => [...lines]).toThrow(PlyHeaderParseError);
  });
});
