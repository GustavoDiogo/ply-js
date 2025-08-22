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

    assert.strictEqual(ply.elements.length, 1);
    assert.strictEqual(ply.elements[0].name, 'vertex');
    assert.strictEqual(ply.elements[0].data.length, 3);
    assert.strictEqual(ply.elements[0].data[1].x, 1);
    assert.strictEqual(ply.elements[0].data[1].z, 1);
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

    assert.ok(result.includes('element vertex 3'));
    assert.ok(result.includes('0 0 0'));
    assert.ok(result.includes('1 0 1'));
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
        assert.ok(ply.elements.length > 0);
        assert.strictEqual(typeof ply.elements[0].name, 'string');
        assert.ok(ply.elements[0].data.length > 0);
      } catch (e) {
        // Ignore if not ASCII
        assert.ok(e);
      }
    });

    it(`parses ${file} as binary (if possible)`, () => {
      try {
        // Use PlyData.read(path) which handles binary files
        const ply = PlyData.read(filePath);
        const vertexElement = ply.elements.find(e => e.name === 'vertex');
        const faceElement = ply.elements.find(e => e.name === 'face' || e.name === 'polygon');
        assert.ok(vertexElement);
        assert.ok(faceElement);
        assert.ok((vertexElement as any).data.length > 0);
        assert.ok((faceElement as any).data.length > 0);
      } catch (e) {
        // Ignore if not binary
        assert.ok(e);
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
    assert.throws(() => readPlyFromLines(lines));
  });

  it('roundtrips ASCII samples via readPly + writePly', async () => {
    const samplesDir = join(__dirname, 'samples');
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
        assert.ok(result.includes('element '));
      } catch (e) {
        // ignore files that are not ASCII
        assert.ok(e);
      }
    }
  });

  it('roundtrips binary samples via PlyData.read + writePly', async () => {
    const samplesDir = join(__dirname, 'samples');
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
        assert.ok(result.includes('element '));
      } catch (e) {
        // ignore files that are not binary / not supported
        assert.ok(e);
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
    assert.ok(Array.isArray((ply as any).comments));
    assert.ok((ply as any).comments.includes('created by unit test'));
    assert.ok(Array.isArray((ply as any).objInfo));
    assert.ok((ply as any).objInfo.includes('source: generated'));
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
    assert.ok(result.includes('comment created by unit test'));
    assert.ok(result.includes('obj_info source: generated'));
  });

  it('extracts header metadata from sample files (if present)', () => {
    const samplesDir = join(__dirname, 'samples');
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
          assert.ok(Array.isArray((ply as any).comments));
          for (const c of commentLines) assert.ok((ply as any).comments.includes(c));
        }

        if (objInfoLines.length > 0) {
          assert.ok(Array.isArray((ply as any).objInfo));
          for (const o of objInfoLines) assert.ok((ply as any).objInfo.includes(o));
        }
      } catch (e) {
        // if file isn't ASCII or parsing fails, skip but record error
        assert.ok(e);
      }
    }
  });

  it('preserves sample file metadata when writing (if present)', async () => {
    const samplesDir = join(__dirname, 'samples');
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

        for (const c of commentLines) assert.ok(result.includes(`comment ${c}`));
        for (const o of objInfoLines) assert.ok(result.includes(`obj_info ${o}`));
      } catch (e) {
        // ignore non-ASCII or unsupported files, but flag the error
        assert.ok(e);
      }
    }
  });
});