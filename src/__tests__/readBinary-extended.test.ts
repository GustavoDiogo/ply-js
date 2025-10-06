import { readBinaryPly } from '../readBinary';
import { PlyData } from '../data';

describe('readBinary tests for increased coverage', () => {
  test('readBinaryPly handles ASCII PLY format', () => {
    const asciiPly = `ply
format ascii 1.0
element vertex 2
property float x
property float y
property float z
end_header
0.0 0.0 0.0
1.0 1.0 1.0
`;
    
    const buffer = Buffer.from(asciiPly, 'utf8');
    const result = readBinaryPly(buffer);
    
    expect(result).toBeInstanceOf(PlyData);
    expect(result.text).toBe(true);
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].name).toBe('vertex');
    expect(result.elements[0].count).toBe(2);
    expect(result.elements[0].data).toHaveLength(2);
  });

  test('readBinaryPly handles binary little endian format', () => {
    const header = 'ply\nformat binary_little_endian 1.0\nelement vertex 1\nproperty float x\nproperty float y\nproperty float z\nend_header\n';
    const headerBuf = Buffer.from(header, 'ascii');
    
    // Create binary data for one vertex (3 floats)
    const dataBuf = Buffer.allocUnsafe(12);
    dataBuf.writeFloatLE(1.0, 0);  // x
    dataBuf.writeFloatLE(2.0, 4);  // y  
    dataBuf.writeFloatLE(3.0, 8);  // z
    
    const fullBuffer = Buffer.concat([headerBuf, dataBuf]);
    const result = readBinaryPly(fullBuffer);
    
    expect(result).toBeInstanceOf(PlyData);
    expect(result.text).toBe(false);
    expect(result.byteOrder).toBe('<');
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].data).toHaveLength(1);
    expect(result.elements[0].data[0].x).toBeCloseTo(1.0);
    expect(result.elements[0].data[0].y).toBeCloseTo(2.0);
    expect(result.elements[0].data[0].z).toBeCloseTo(3.0);
  });

  test('readBinaryPly handles binary big endian format', () => {
    const header = 'ply\nformat binary_big_endian 1.0\nelement vertex 1\nproperty float x\nproperty float y\nend_header\n';
    const headerBuf = Buffer.from(header, 'ascii');
    
    // Create binary data for one vertex (2 floats)
    const dataBuf = Buffer.allocUnsafe(8);
    dataBuf.writeFloatBE(5.0, 0);  // x
    dataBuf.writeFloatBE(6.0, 4);  // y
    
    const fullBuffer = Buffer.concat([headerBuf, dataBuf]);
    const result = readBinaryPly(fullBuffer);
    
    expect(result).toBeInstanceOf(PlyData);
    expect(result.text).toBe(false);
    expect(result.byteOrder).toBe('>');
    expect(result.elements[0].data[0].x).toBeCloseTo(5.0);
    expect(result.elements[0].data[0].y).toBeCloseTo(6.0);
  });

  test('readBinaryPly handles PLY with comments and objInfo', () => {
    const plyWithComments = `ply
format ascii 1.0
comment This is a test PLY file
comment Generated for testing
obj_info num_cols 10
obj_info num_rows 20
element vertex 1
property float x
property float y
end_header
1.5 2.5
`;
    
    const buffer = Buffer.from(plyWithComments, 'utf8');
    const result = readBinaryPly(buffer);
    
    expect(result.comments).toContain('This is a test PLY file');
    expect(result.comments).toContain('Generated for testing');
    expect(result.objInfo).toContain('num_cols 10');
    expect(result.objInfo).toContain('num_rows 20');
  });

  test('readBinaryPly handles multiple elements', () => {
    const multiElementPly = `ply
format ascii 1.0
element vertex 2
property float x
property float y
element edge 1
property int vertex1
property int vertex2
end_header
0.0 0.0
1.0 1.0
0 1
`;
    
    const buffer = Buffer.from(multiElementPly, 'utf8');
    const result = readBinaryPly(buffer);
    
    expect(result.elements).toHaveLength(2);
    expect(result.elements[0].name).toBe('vertex');
    expect(result.elements[1].name).toBe('edge');
    expect(result.elements[0].count).toBe(2);
    expect(result.elements[1].count).toBe(1);
  });

  test('readBinaryPly handles empty buffer gracefully', () => {
    expect(() => {
      readBinaryPly(Buffer.alloc(0));
    }).toThrow();
  });

  test('readBinaryPly handles malformed header', () => {
    const malformedPly = 'not a ply file\nrandom content';
    const buffer = Buffer.from(malformedPly, 'utf8');
    
    expect(() => {
      readBinaryPly(buffer);
    }).toThrow();
  });
});
