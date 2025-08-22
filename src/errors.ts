export class PlyParseError extends Error {}

export class PlyElementParseError extends PlyParseError {
  constructor(
    public message: string,
    public element?: { name: string },
    public row?: number | null,
    public prop?: { name: string } | null
  ) {
    super(
      `${element ? `element '${element.name}': ` : ''}` +
        `${row !== undefined && row !== null ? `row ${row}: ` : ''}` +
        `${prop ? `property '${prop.name}': ` : ''}` +
        message
    );
    this.name = 'PlyElementParseError';
  }
}

export class PlyHeaderParseError extends PlyParseError {
  constructor(public message: string, public line?: number) {
    super(`${line ? `line ${line}: ` : ''}${message}`);
    this.name = 'PlyHeaderParseError';
  }
}