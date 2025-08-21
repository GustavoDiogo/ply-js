import { PlyJs } from './plyjs';
import { writeBinaryScalar } from './binary';
import { PlyListProperty, PlyProperty } from './properties';

/**
 * Serializes a PlyData object to a binary PLY file Buffer.
 *
 * This function writes the full header and binary body using proper endianness
 * and handles both scalar and list properties.
 *
 * @param ply - The PlyData object containing elements and properties to serialize.
 * @returns A Node.js Buffer containing the complete binary .ply file contents.
 */
export function writeBinaryPly(ply: PlyJs): Buffer {
  const header = Buffer.from(ply.header + '\n', 'ascii');
  const binaryChunks: Buffer[] = [];

  for (const element of ply.elements) {
    for (const record of element.data) {
      const chunk = Buffer.alloc(1024); // generous buffer size per record
      let offset = 0;

      for (const prop of element.properties) {
        const value = record[prop.name];
        if (prop instanceof PlyListProperty) {
          offset = writeBinaryScalar(chunk, offset, value.length, prop.lenType, ply.byteOrder);
          for (const item of value) {
            offset = writeBinaryScalar(chunk, offset, item, prop.valType, ply.byteOrder);
          }
        } else if (prop instanceof PlyProperty) {
          offset = writeBinaryScalar(chunk, offset, value, prop.valType, ply.byteOrder);
        }
      }

      binaryChunks.push(chunk.slice(0, offset));
    }
  }

  return Buffer.concat([header, ...binaryChunks]);
}
