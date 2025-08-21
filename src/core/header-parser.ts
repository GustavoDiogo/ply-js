import { PlyListProperty, PlyProperty } from "./properties";

export class PlyHeaderParser {
  public format: string = '';
  public elements: [string, PlyProperty[], number, string[]][] = [];
  public comments: string[] = [];
  public objInfo: string[] = [];

  private allowed: string[] = ['format', 'comment', 'obj_info'];

  constructor(lines: Iterable<string>) {
    let currentElement: [string, PlyProperty[], number, string[]] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [keyword, ...rest] = trimmed.split(/\s+/);
      const content = rest.join(' ');

      switch (keyword) {
        case 'format':
          const [fmt, version] = rest;
          if (!fmt || version !== '1.0') throw new Error(`Invalid format line: ${line}`);
          this.format = fmt;
          this.allowed = ['element', 'comment', 'obj_info', 'end_header'];
          break;

        case 'comment':
          if (currentElement) currentElement[3].push(content);
          else this.comments.push(content);
          break;

        case 'obj_info':
          this.objInfo.push(content);
          break;

        case 'element':
          const [name, countStr] = rest;
          if (!name || isNaN(+countStr)) throw new Error(`Invalid element line: ${line}`);
          currentElement = [name, [], parseInt(countStr), []];
          this.elements.push(currentElement);
          this.allowed = ['element', 'comment', 'property', 'end_header'];
          break;

        case 'property':
          if (!currentElement) throw new Error(`'property' outside of element block: ${line}`);
          const tokens = rest;
          if (tokens[0] === 'list') {
            const [_, lenType, valType, propName] = tokens;
            currentElement[1].push(new PlyListProperty(propName, lenType, valType));
          } else {
            const [valType, propName] = tokens;
            currentElement[1].push(new PlyProperty(propName, valType));
          }
          break;

        case 'end_header':
          this.allowed = [];
          break;

        default:
          throw new Error(`Unexpected keyword '${keyword}' at line: ${line}`);
      }
    }
  }
}