import { PlyProperty, PlyListProperty } from '../property';
import { PlyElement } from '../element';
import { PlyData } from '../data';
import { writeBinaryPly, readBinaryPly } from '../readBinary';

test('readBinaryPly reads a small ascii ply buffer', () => {
  const text = 'ply\nformat ascii 1.0\nelement vertex 2\nproperty float x\nproperty float y\nend_header\n0 1\n2 3\n';
  const buf = Buffer.from(text, 'utf8');
  const out = readBinaryPly(buf);
  expect(out.elements[0].data.length).toBe(2);
  expect(out.elements[0].data[1].y).toBe(3);
});
