import { ByteOrder, ByteOrderReverse } from './types';
import { PlyElement } from './element';

/**
 * Represents a full PLY file structure, including metadata and element definitions.
 * Provides methods to query, manipulate, and generate the PLY header.
 */
export class PlyJs {
  /**
   * Creates a new PlyData instance.
   *
   * @param elements - Array of PlyElement instances (e.g. vertex, face) that define the data structure
   * @param text - Whether the file format is ASCII (true) or binary (false)
   * @param byteOrder - Byte order to use for binary files: '<', '>', or '=' (native)
   * @param comments - Optional array of comments inserted before the first element in the header
   * @param objInfo - Optional array of obj_info entries to include in the header
   */
  constructor(
    public elements: PlyElement[],
    public text: boolean = false,
    public byteOrder: ByteOrder = '=',
    public comments: string[] = [],
    public objInfo: string[] = []
  ) {}

  /**
   * Returns the complete PLY header as a string.
   * Includes the format line, optional comments and obj_info, and element/property definitions.
   */
  get header(): string {
    const lines: string[] = ['ply'];

    lines.push(
      this.text ? 'format ascii 1.0' : `format ${ByteOrderReverse[this.byteOrder]} 1.0`
    );

    for (const c of this.comments) lines.push(`comment ${c}`);
    for (const c of this.objInfo) lines.push(`obj_info ${c}`);
    for (const el of this.elements) lines.push(el.header);

    lines.push('end_header');
    return lines.join('\n');
  }

  /**
   * Returns the PLY header as a string. Equivalent to `get header()`.
   */
  toString(): string {
    return this.header;
  }

  /**
   * Checks whether an element with the specified name exists.
   *
   * @param name - Name of the element to check
   * @returns True if the element exists, false otherwise
   */
  hasElement(name: string): boolean {
    return this.elements.some(e => e.name === name);
  }

  /**
   * Retrieves an element by name.
   *
   * @param name - Name of the element
   * @returns The corresponding PlyElement or undefined if not found
   */
  getElement(name: string): PlyElement | undefined {
    return this.elements.find(e => e.name === name);
  }
}

