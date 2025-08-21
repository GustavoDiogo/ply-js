import { PlyJs } from './plyjs';
import { PlyElement } from './element';
import { PlyHeaderParser } from './header-parser';
import { ByteOrderMap } from './types';

/**
 * Reads a PLY file in ASCII format from a line-based async iterable stream.
 *
 * @param stream - An async iterable of lines from a PLY file (e.g., from readline or text decoder)
 * @returns A parsed PlyData object representing the full contents of the PLY
 */

export async function readPly(stream: AsyncIterable<string>): Promise<PlyJs> {
  // For compatibility, collect all lines and delegate to readPlyFromLines
  const lines: string[] = [];
  for await (const line of stream) lines.push(line);
  return readPlyFromLines(lines);
}

export function readPlyFromLines(lines: string[]): PlyJs {
  const headerLines: string[] = [];
  let headerEndIdx = -1;
  for (let i = 0; i < lines.length; ++i) {
    const trimmed = lines[i].trim();
    headerLines.push(trimmed);
    if (trimmed === 'end_header') {
      headerEndIdx = i;
      break;
    }
  }
  if (headerEndIdx === -1) throw new Error('PLY header not terminated with end_header');

  const parser = new PlyHeaderParser(headerLines.slice(1));
  const elements = parser.elements.map(
    ([name, props, count, comments]) => new PlyElement(name, props, count, comments)
  );
  const ply = new PlyJs(
    elements,
    parser.format === 'ascii',
    ByteOrderMap[parser.format] ?? '=',
    parser.comments,
    parser.objInfo
  );

  // Parse data lines
  for (let i = headerEndIdx + 1; i < lines.length; ++i) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = line.split(/\s+/);
    for (const element of ply.elements) {
      const record: Record<string, any> = {};
      let idx = 0;
      for (const prop of element.properties) {
        if ('lenType' in prop) {
          const listLen = parseInt(fields[idx++], 10);
          record[prop.name] = fields.slice(idx, idx + listLen).map(Number);
          idx += listLen;
        } else {
          record[prop.name] = Number(fields[idx++]);
        }
      }
      element.data.push(record);
    }
  }
  return ply;
}
