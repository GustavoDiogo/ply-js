import { PlyData } from './data';
/**
 * Read a binary or ASCII PLY from a Buffer and return a fully parsed PlyData.
 * This is the root-level implementation previously living under src/core.
 */
export declare function readBinaryPly(buffer: Buffer): PlyData;
/**
 * Serialize a PlyData into a binary Buffer. If ply.text is true this will
 * still write an ASCII PLY; for binary output ensure ply.text === false.
 */
export declare function writeBinaryPly(ply: PlyData): Buffer;
