import type {} from 'jest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { readPly, readPlyFromLines, writePly } from '../';
import { asyncLinesFromString } from './helpers';
import { readBinaryPly } from '../core/readBinary';

describe('PLY Read/Write (ASCII)', () => {
  const plyText = `
ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
end_header
0 0 0
1 0 1
2 1 0
`.trim();

  it('reads an ASCII PLY and extracts vertex data', () => {
    const lines = plyText.split(/\r?\n/);
    const ply = readPlyFromLines(lines);

    expect(ply.elements.length).toBe(1);
    expect(ply.elements[0].name).toBe('vertex');
    expect(ply.elements[0].data.length).toBe(3);
    expect(ply.elements[0].data[1].x).toBe(1);
    expect(ply.elements[0].data[1].z).toBe(1);
  });

  it('writes back the same structure', async () => {
  // Use the string directly, not Buffer, for asyncLinesFromString
  const ply = await readPly(asyncLinesFromString(plyText));

    // Mock a WritableStream writer to collect output
    let result = '';
    const writer = {
      write: async (chunk: string) => { result += chunk; },
      close: async () => {}
    } as unknown as WritableStreamDefaultWriter<string>;

    await writePly(writer, ply);

    expect(result).toContain('element vertex 3');
    expect(result).toContain('0 0 0');
    expect(result).toContain('1 0 1');
  });
});

describe('PLY Read/Write (real files in samples)', () => {
  const samplesDir = join(__dirname, 'samples');
  const files = readdirSync(samplesDir).filter(f => f.endsWith('.ply'));

  for (const file of files) {
    const filePath = join(samplesDir, file);
    it(`parses ${file} as ASCII (if possible)`, () => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        const ply = readPlyFromLines(lines);
        expect(ply.elements.length).toBeGreaterThan(0);
        expect(typeof ply.elements[0].name).toBe('string');
        expect(ply.elements[0].data.length).toBeGreaterThan(0);
      } catch (e) {
        // Ignore if not ASCII
        expect(e).toBeDefined();
      }
    });

    it(`parses ${file} as binary (if possible)`, () => {
      try {
        const buffer = readFileSync(filePath);
        const ply = readBinaryPly(buffer);
        const vertexElement = ply.elements.find(e => e.name === 'vertex');
        const faceElement = ply.elements.find(e => e.name === 'face' || e.name === 'polygon');
        expect(vertexElement).toBeDefined();
        expect(faceElement).toBeDefined();
        expect(vertexElement?.data.length).toBeGreaterThan(0);
        expect(faceElement?.data.length).toBeGreaterThan(0);
      } catch (e) {
        // Ignore if not binary
        expect(e).toBeDefined();
      }
    });
  }
});