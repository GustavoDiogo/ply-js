import { PlyJs } from './plyjs';
import { PlyElement } from './element';
import { PlyHeaderParser } from './header-parser';
import { ByteOrderMap } from './types';
import { readBinaryScalar } from './binary';
import { PlyListProperty, PlyProperty } from './properties';

/**
 * Parses a binary PLY Buffer and reconstructs the corresponding PlyData object.
 *
 * @param buffer - A Buffer containing binary PLY data (including header)
 * @returns A PlyData object representing the parsed elements and data
 */
export function readBinaryPly(buffer: Buffer): PlyJs {
  const raw = buffer.toString('ascii');
  const headerEnd = raw.indexOf('end_header');
  if (headerEnd < 0) throw new Error('Invalid PLY: no end_header');

  const headerText = raw.slice(0, headerEnd);
  const headerLines = headerText.split(/\r?\n/);

  const parser = new PlyHeaderParser(headerLines.slice(1));
  const byteOrder = ByteOrderMap[parser.format] ?? '=';
  const ply = new PlyJs(
    parser.elements.map(([name, props, count, comments]) =>
      new PlyElement(name, props, count, comments)
    ),
    false,
    byteOrder,
    parser.comments,
    parser.objInfo
  );

  let offset = headerEnd + 'end_header'.length + 1;

  for (const element of ply.elements) {
    for (let i = 0; i < element.count; i++) {
      const record: Record<string, any> = {};
      for (const prop of element.properties) {
        if (prop instanceof PlyListProperty) {
          let len: number;
          [len, offset] = readBinaryScalar(buffer, offset, prop.lenType, byteOrder);
          const list: number[] = [];
          for (let j = 0; j < len; j++) {
            let val: number;
            [val, offset] = readBinaryScalar(buffer, offset, prop.valType, byteOrder);
            list.push(val);
          }
          record[prop.name] = list;
        } else if (prop instanceof PlyProperty) {
          let val: number;
          [val, offset] = readBinaryScalar(buffer, offset, prop.valType, byteOrder);
          record[prop.name] = val;
        }
      }
      element.data.push(record);
    }
  }

  return ply;
} 
