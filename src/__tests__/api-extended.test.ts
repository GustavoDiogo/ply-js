import { readPlyFromLines, readPly, writePly } from '../api';
import { PlyData } from '../data';
import { Writable } from 'stream';

describe('API tests for increased coverage', () => {
  const samplePlyLines = [
    'ply',
    'format ascii 1.0',
    'element vertex 2',
    'property float x',
    'property float y', 
    'property float z',
    'end_header',
    '0.0 0.0 0.0',
    '1.0 1.0 1.0'
  ];

  test('readPlyFromLines handles array input', () => {
    const result = readPlyFromLines(samplePlyLines);
    
    expect(result).toBeInstanceOf(PlyData);
    expect(result.text).toBe(true);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].count).toBe(2);
    expect(result.elements[0].data).toHaveLength(2);
  });

  test('readPlyFromLines handles iterable input', () => {
    const iterable = {
      *[Symbol.iterator]() {
        for (const line of samplePlyLines) {
          yield line;
        }
      }
    };
    
    const result = readPlyFromLines(iterable);
    expect(result).toBeInstanceOf(PlyData);
    expect(result.elements[0].count).toBe(2);
  });

  test('readPlyFromLines throws on missing end_header', () => {
    const invalidLines = [
      'ply',
      'format ascii 1.0',
      'element vertex 1',
      'property float x'
      // missing end_header
    ];
    
    expect(() => {
      readPlyFromLines(invalidLines);
    }).toThrow('no end_header');
  });

  test('readPlyFromLines throws on missing ply header', () => {
    const invalidLines = [
      'format ascii 1.0',
      'element vertex 1',
      'end_header'
    ];
    
    expect(() => {
      readPlyFromLines(invalidLines);
    }).toThrow("expected 'ply' as first line");
  });

  test('readPlyFromLines throws on binary format', () => {
    const binaryLines = [
      'ply',
      'format binary_little_endian 1.0',
      'element vertex 1',
      'property float x',
      'end_header'
    ];
    
    expect(() => {
      readPlyFromLines(binaryLines);
    }).toThrow('binary header detected; use readBinaryPly');
  });

  test('readPly handles sync iterable', async () => {
    const result = await readPly(samplePlyLines);
    
    expect(result).toBeInstanceOf(PlyData);
    expect(result.elements[0].count).toBe(2);
  });

  test('readPly handles async iterable', async () => {
    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        for (const line of samplePlyLines) {
          yield line;
        }
      }
    };
    
    const result = await readPly(asyncIterable);
    expect(result).toBeInstanceOf(PlyData);
    expect(result.elements[0].count).toBe(2);
  });

  test('writePly writes header and data', async () => {
    const result = readPlyFromLines(samplePlyLines);
    
    let output = '';
    const writer = {
      write: (chunk: string) => {
        output += chunk;
        return Promise.resolve();
      }
    };
    
    await writePly(writer, result);
    
    expect(output).toContain('ply');
    expect(output).toContain('format ascii 1.0');
    expect(output).toContain('element vertex 2');
    expect(output).toContain('end_header');
    expect(output).toContain('0 0 0');
    expect(output).toContain('1 1 1');
  });

  test('readPlyFromLines handles PLY with comments', () => {
    const linesWithComments = [
      'ply',
      'format ascii 1.0',
      'comment Test file',
      'element vertex 1',
      'property float x',
      'end_header',
      '5.0'
    ];
    
    const result = readPlyFromLines(linesWithComments);
    expect(result.comments).toContain('Test file');
  });

  test('readPlyFromLines handles PLY with obj_info', () => {
    const linesWithObjInfo = [
      'ply',
      'format ascii 1.0',
      'obj_info author test',
      'element vertex 1',
      'property float x',
      'end_header',
      '7.0'
    ];
    
    const result = readPlyFromLines(linesWithObjInfo);
    expect(result.objInfo).toContain('author test');
  });

  test('readPlyFromLines handles multiple elements', () => {
    const multiElementLines = [
      'ply',
      'format ascii 1.0',
      'element vertex 2',
      'property float x',
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      '1.0',
      '2.0',
      '2 0 1'
    ];
    
    const result = readPlyFromLines(multiElementLines);
    expect(result.elements).toHaveLength(2);
    expect(result.elements[0].name).toBe('vertex');
    expect(result.elements[1].name).toBe('face');
    expect(result.elements[0].count).toBe(2);
    expect(result.elements[1].count).toBe(1);
  });

  test('writePly handles complex PLY data', async () => {
    const complexLines = [
      'ply',
      'format ascii 1.0',
      'comment Complex test file',
      'element vertex 2',
      'property float x',
      'property float y',
      'element face 1',
      'property list uchar int vertex_indices',
      'end_header',
      '0.0 0.0',
      '1.0 1.0',
      '2 0 1'
    ];
    
    const plyData = readPlyFromLines(complexLines);
    
    let output = '';
    const writer = {
      write: (chunk: string) => {
        output += chunk;
        return Promise.resolve();
      }
    };
    
    await writePly(writer, plyData);
    
    expect(output).toContain('comment Complex test file');
    expect(output).toContain('element vertex 2');
    expect(output).toContain('element face 1');
    expect(output).toContain('property list uchar int vertex_indices');
  });
});
