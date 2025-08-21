import { PlyProperty, PlyListProperty } from './properties';

/**
 * Represents a PLY element block, such as vertex or face.
 * Contains its name, properties, number of records, and associated comments.
 */
export class PlyElement {
  public data: Record<string, any>[] = [];
  private propertyMap: Record<string, PlyProperty> = {};

  /**
   * @param name - Element name (e.g., 'vertex', 'face')
   * @param properties - List of property definitions (scalar or list)
   * @param count - Number of expected records (used in header)
   * @param comments - Optional comment lines in the header for this element
   */
  constructor(
    public name: string,
    public properties: (PlyProperty | PlyListProperty)[],
    public count: number,
    public comments: string[] = []
  ) {
    this.indexProperties();
  }

  /**
   * Index properties by name to allow quick lookup and validation.
   */
  private indexProperties() {
    for (const prop of this.properties) {
      if (this.propertyMap[prop.name]) {
        throw new Error(`Duplicate property: ${prop.name}`);
      }
      this.propertyMap[prop.name] = prop;
    }
  }

  /**
   * Checks whether this element includes a property with the given name.
   */
  hasProperty(name: string): boolean {
    return name in this.propertyMap;
  }

  /**
   * Returns the property definition if it exists.
   */
  getProperty(name: string): PlyProperty | undefined {
    return this.propertyMap[name];
  }

  /**
   * Generates the full PLY header block for this element, including properties and comments.
   */
  get header(): string {
    const lines = [`element ${this.name} ${this.count}`];
    for (const comment of this.comments) {
      lines.push(`comment ${comment}`);
    }
    lines.push(...this.properties.map(p => p.toHeaderString()));
    return lines.join('\n');
  }

  /**
   * String representation of the element’s header (for debugging/logging).
   */
  toString(): string {
    return this.header;
  }
}
