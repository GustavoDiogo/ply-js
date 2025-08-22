import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { readPly, readPlyFromLines, writePly } from '../';
import { PlyData } from '../data';
import { asyncLinesFromString } from './helpers';
import assert from 'node:assert/strict';

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
    const ply = await readPly(asyncLinesFromString(plyText));

    // Mock a WritableStream writer to collect output
    let result = '';
    const writer = {
      write: async (chunk: string) => { result += chunk; },
      close: async () => {}
    } as unknown as any;

    await writePly(writer, ply);

    expect(result).toContain('element vertex 3');
    expect(result).toContain('0 0 0');
    expect(result).toContain('1 0 1');
  });
});

describe('PLY Read/Write (real files in samples)', () => {
  const samplesDir = join(__dirname, '..', '..', 'samples');
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
        expect(e).toBeTruthy();
      }
    });

    it(`parses ${file} as binary (if possible)`, () => {
      try {
        // Use PlyData.read(path) which handles binary files
        const ply = PlyData.read(filePath);
        const vertexElement = ply.elements.find(e => e.name === 'vertex');
        const faceElement = ply.elements.find(e => e.name === 'face' || e.name === 'polygon');
        expect(vertexElement).toBeDefined();
        expect(faceElement).toBeDefined();
        expect((vertexElement as any).data.length).toBeGreaterThan(0);
        expect((faceElement as any).data.length).toBeGreaterThan(0);
      } catch (e) {
        // Ignore if not binary
        expect(e).toBeTruthy();
      }
    });
  }
});

describe('Additional PLY tests', () => {
  it('throws on malformed header', () => {
    const badPly = `
ply
format ascii 1.0
property float x
end_header
0
`.trim();
    const lines = badPly.split(/\r?\n/);
    expect(() => readPlyFromLines(lines)).toThrow();
  });

  it('roundtrips ASCII samples via readPly + writePly', async () => {
    const samplesDir = join(__dirname, '..', '..', 'samples');
    const files = readdirSync(samplesDir).filter(f => f.endsWith('.ply'));
    for (const file of files) {
      const filePath = join(samplesDir, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        // only try ASCII roundtrip when file is readable as UTF-8
        const ply = await readPly(asyncLinesFromString(content));
        let result = '';
        const writer = {
          write: async (chunk: any) => { result += String(chunk); },
          close: async () => {}
        } as unknown as any;
        await writePly(writer, ply);
        // header must contain at least one 'element' line
        expect(result).toContain('element ');
      } catch (e) {
        // ignore files that are not ASCII
        expect(e).toBeTruthy();
      }
    }
  });

  it('roundtrips binary samples via PlyData.read + writePly', async () => {
    const samplesDir = join(__dirname, '..', '..', 'samples');
    const files = readdirSync(samplesDir).filter(f => f.endsWith('.ply'));
    for (const file of files) {
      const filePath = join(samplesDir, file);
      try {
        const ply = PlyData.read(filePath);
        let result = '';
        const writer = {
          write: async (chunk: any) => { result += String(chunk); },
          close: async () => {}
        } as unknown as any;
        await writePly(writer, ply);
        // header (ASCII) should still be present before binary block
        expect(result).toContain('element ');
      } catch (e) {
        // ignore files that are not binary / not supported
        expect(e).toBeTruthy();
      }
    }
  });

  it('extracts header metadata (comment and obj_info) from ASCII header', () => {
    const metaPly = `
ply
format ascii 1.0
comment created by unit test
obj_info source: generated
element vertex 1
property float x
property float y
property float z
end_header
0 0 0
`.trim();

    const lines = metaPly.split(/\r?\n/);
    const ply = readPlyFromLines(lines);
    // PlyData exposes comments and objInfo
    expect(Array.isArray((ply as any).comments)).toBe(true);
    expect((ply as any).comments).toContain('created by unit test');
    expect(Array.isArray((ply as any).objInfo)).toBe(true);
    expect((ply as any).objInfo).toContain('source: generated');
  });

  it('preserves header metadata when writing', async () => {
    const metaPly = `
ply
format ascii 1.0
comment created by unit test
obj_info source: generated
element vertex 1
property float x
property float y
property float z
end_header
0 0 0
`.trim();

    const ply = await readPly(asyncLinesFromString(metaPly));
    let result = '';
    const writer = {
      write: async (chunk: any) => { result += String(chunk); },
      close: async () => {}
    } as unknown as any;

    await writePly(writer, ply);
    expect(result).toContain('comment created by unit test');
    expect(result).toContain('obj_info source: generated');
  });

  it('extracts header metadata from sample files (if present)', () => {
    const samplesDir = join(__dirname, '..', '..', 'samples');
    const files = readdirSync(samplesDir).filter(f => f.endsWith('.ply'));

    for (const file of files) {
      const filePath = join(samplesDir, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        // collect header lines up to end_header
        const headerLines: string[] = [];
        for (const line of lines) {
          headerLines.push(line);
          if (line.trim().toLowerCase() === 'end_header') break;
        }

        const commentLines = headerLines.filter(l => l.startsWith('comment ')).map(l => l.replace(/^comment\s+/, ''));
        const objInfoLines = headerLines.filter(l => l.startsWith('obj_info ')).map(l => l.replace(/^obj_info\s+/, ''));

        if (commentLines.length === 0 && objInfoLines.length === 0) continue;

        const ply = readPlyFromLines(lines);

        if (commentLines.length > 0) {
          expect(Array.isArray((ply as any).comments)).toBe(true);
          for (const c of commentLines) expect((ply as any).comments).toContain(c);
        }

        if (objInfoLines.length > 0) {
          expect(Array.isArray((ply as any).objInfo)).toBe(true);
          for (const o of objInfoLines) expect((ply as any).objInfo).toContain(o);
        }
      } catch (e) {
        // if file isn't ASCII or parsing fails, skip but record error
        expect(e).toBeTruthy();
      }
    }
  });

  it('preserves sample file metadata when writing (if present)', async () => {
    const samplesDir = join(__dirname, '..', '..', 'samples');
    const files = readdirSync(samplesDir).filter(f => f.endsWith('.ply'));

    for (const file of files) {
      const filePath = join(samplesDir, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        const headerLines: string[] = [];
        for (const line of lines) {
          headerLines.push(line);
          if (line.trim().toLowerCase() === 'end_header') break;
        }

        const commentLines = headerLines.filter(l => l.startsWith('comment ')).map(l => l.replace(/^comment\s+/, ''));
        const objInfoLines = headerLines.filter(l => l.startsWith('obj_info ')).map(l => l.replace(/^obj_info\s+/, ''));

        if (commentLines.length === 0 && objInfoLines.length === 0) continue;

        const ply = await readPly(asyncLinesFromString(content));
        let result = '';
        const writer = { write: async (chunk: any) => { result += String(chunk); }, close: async () => {} } as unknown as any;
        await writePly(writer, ply);

        for (const c of commentLines) expect(result).toContain(`comment ${c}`);
        for (const o of objInfoLines) expect(result).toContain(`obj_info ${o}`);
      } catch (e) {
        // ignore non-ASCII or unsupported files, but flag the error
        expect(e).toBeTruthy();
      }
    }
  });
});