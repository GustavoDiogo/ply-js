// [PREVIOUS CONTENT ABOVE OMITTED FOR BREVITY]

// core/PlyProperty.ts

/**
 * Represents a scalar property in a PLY element.
 * Used for fields like x, y, z, red, green, blue, etc.
 */
export class PlyProperty {
  constructor(public name: string, public valType: string) {
    if (!name) throw new Error("Invalid empty property name");
  }

  /**
   * Returns the TypeScript-style dtype string (not NumPy)
   */
  get dtype(): string {
    return `|${this.valType}`;
  }

  /**
   * Generates the line representing this property for the PLY header.
   */
  toHeaderString(): string {
    return `property ${this.valType} ${this.name}`;
  }
}

/**
 * Represents a list property in a PLY element.
 * Used for fields like vertex_index or face indices.
 */
export class PlyListProperty extends PlyProperty {
  constructor(
    name: string,
    public lenType: string,
    valType: string
  ) {
    super(name, valType);
  }

  /**
   * Returns the length and value dtype descriptors.
   */
  get listDtype(): [string, string] {
    return [`|${this.lenType}`, `|${this.valType}`];
  }

  /**
   * Generates the line representing this list property for the PLY header.
   */
  toHeaderString(): string {
    return `property list ${this.lenType} ${this.valType} ${this.name}`;
  }
}
