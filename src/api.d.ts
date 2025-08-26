import { PlyElement } from './element';
import { PlyData } from './data';
export declare function readPlyFromLines(lines: Iterable<string>): PlyData;
export declare function readPly(lines: AsyncIterable<string> | Iterable<string>): Promise<PlyData>;
export declare function writePly(writer: {
    write: (chunk: string) => any;
}, ply: PlyData): Promise<void>;
/**
 * Return an object mapping element name -> PlyElement for convenient access.
 */
export declare function elementMap(ply: PlyData): Record<string, PlyElement>;
/**
 * Extract common metadata (num vertices, num faces, format, elements list)
 * This mirrors the convenience of python-plyfile's PlyData accessors.
 */
export declare function extractMetadata(ply: PlyData): {
    numVertices: number;
    numFaces: number;
    format: string;
    elements: string[];
};
