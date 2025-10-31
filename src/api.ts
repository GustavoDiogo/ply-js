import { PlyHeaderParser } from './header';
import { PlyElement } from './element';
import { PlyData } from './data';
import { byteOrderMap } from './utils';
import { isValidPlyBuffer, validatePlyBuffer } from './readBinary';
import type { ByteOrder } from './types';

export function readPlyFromLines(lines: Iterable<string>): PlyData {
  const arr = Array.isArray(lines) ? (lines as string[]) : Array.from(lines);
  // find end_header
  const endIdx = arr.findIndex(l => l.trim() === 'end_header');
  if (endIdx === -1) throw new Error('no end_header');
  const headerLines = arr.slice(0, endIdx + 1);
  const dataLines = arr.slice(endIdx + 1);

  // Header parser expects lines after the initial 'ply' line
  if (headerLines.length === 0 || headerLines[0].trim() !== 'ply') throw new Error("expected 'ply' as first line");
  const headerIterable = headerLines.slice(1);
  const parser = new PlyHeaderParser(headerIterable);

  const elements = parser.elements.map(e => new PlyElement(e.name, e.properties, e.count, e.comments));
  const pd = new PlyData(elements, parser.format === 'ascii', (byteOrderMap as any)[parser.format as string] ?? '=' , parser.comments, parser.objInfo);

  if (parser.format === 'ascii') {
    let offset = 0;
    for (const elt of pd.elements) {
      const slice = dataLines.slice(offset, offset + elt.count).join('\n');
      (elt as any)._read(Buffer.from(slice, 'utf8'), true, pd.byteOrder, undefined, {});
      offset += elt.count;
    }
  } else {
    throw new Error('binary header detected; use readBinaryPly');
  }

  return pd;
}

export async function readPly(lines: AsyncIterable<string> | Iterable<string>): Promise<PlyData> {
  if ((lines as AsyncIterable<string>)[Symbol.asyncIterator]) {
    const arr: string[] = [];
    for await (const l of lines as AsyncIterable<string>) arr.push(l);
    return readPlyFromLines(arr);
  }
  return readPlyFromLines(lines as Iterable<string>);
}

export async function writePly(writer: { write: (chunk: string) => any }, ply: PlyData): Promise<void> {
  // write header
  const header = ply.header + '\n';
  await writer.write(header);

  for (const elt of ply.elements) {
    const outChunks: Array<string> = [];
    (elt as any)._write({ push: (b: Buffer | string) => { outChunks.push(typeof b === 'string' ? b : b.toString('utf8')); } }, ply.text, ply.byteOrder);
    for (const c of outChunks) {
      await writer.write(c);
    }
  }
}

/**
 * Return an object mapping element name -> PlyElement for convenient access.
 */
export function elementMap(ply: PlyData): Record<string, PlyElement> {
  return Object.fromEntries(ply.elements.map(e => [e.name, e]));
}

/**
 * Extract common metadata (num vertices, num faces, format, elements list)
 * This mirrors the convenience of python-plyfile's PlyData accessors.
 */
export function extractMetadata(ply: PlyData) {
  const map = elementMap(ply);
  const vertex = map['vertex'];
  const face = map['face'] ?? map['polygon'];
  return {
  numVertices: vertex ? vertex.data.length : 0,
  numFaces: face ? face.data.length : 0,
  format: ply.text ? 'ascii' : 'binary',
  elements: ply.elements.map(e => e.name),
  };
}

/**
 * Check if a file, buffer, or stream contains valid PLY data
 * Similar to PlyData.read, accepts: file path (string), Buffer, or Readable stream
 * 
 * @param input - File path (string), Buffer, or Readable stream to validate
 * @returns Promise<boolean> - true if the input is a valid PLY file, false otherwise
 * 
 * @example
 * // Check a file path
 * const isValid = await isPlyFile('model.ply');
 * 
 * // Check a buffer
 * const buffer = fs.readFileSync('model.ply');
 * const isValid = await isPlyFile(buffer);
 * 
 * // Check a stream
 * const stream = fs.createReadStream('model.ply');
 * const isValid = await isPlyFile(stream);
 */
export async function isPlyFile(input: string | Buffer | NodeJS.ReadableStream): Promise<boolean> {
  try {
    // If it's a string (file path), read the file
    if (typeof input === 'string') {
      const fs = await import('fs');
      const buffer = await fs.promises.readFile(input);
      return isValidPlyBuffer(buffer);
    }
    
    // If it's already a Buffer, validate directly
    if (Buffer.isBuffer(input)) {
      return isValidPlyBuffer(input);
    }
    
    // If it's a Readable stream, read the first chunk to validate
    if (input && typeof (input as any).read === 'function') {
      const chunks: Buffer[] = [];
      const stream = input as any; // Use any to avoid type issues with destroy
      
      return new Promise<boolean>((resolve) => {
        let validated = false;
        
        stream.on('data', (chunk: Buffer | string) => {
          if (!validated) {
            // Convert string chunks to Buffer
            const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            chunks.push(bufferChunk);
            const buffer = Buffer.concat(chunks);
            
            // We need at least enough data to check the header
            // PLY files need "ply\n", "format ...", and "end_header\n"
            if (buffer.length >= 200) { // reasonable minimum for header validation
              validated = true;
              if (typeof stream.destroy === 'function') {
                stream.destroy(); // Stop reading once we have enough
              }
              resolve(isValidPlyBuffer(buffer));
            }
          }
        });
        
        stream.on('end', () => {
          if (!validated) {
            const buffer = Buffer.concat(chunks);
            resolve(isValidPlyBuffer(buffer));
          }
        });
        
        stream.on('error', () => {
          resolve(false);
        });
      });
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Re-export PLY validation utilities for external use
 */
export { isValidPlyBuffer, validatePlyBuffer };
