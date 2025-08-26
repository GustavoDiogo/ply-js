import { PlyListProperty, PlyProperty } from './property';
export interface ParsedElement {
    name: string;
    comments: string[];
    count: number;
    properties: (PlyProperty | PlyListProperty)[];
}
export declare class PlyHeaderParser {
    format: string | null;
    elements: ParsedElement[];
    comments: string[];
    objInfo: string[];
    lines: number;
    private _allowed;
    constructor(lines: Iterable<string>);
    consume(rawLine: string): string[];
    private _error;
    parse_format(data: string): void;
    parse_comment(data: string): void;
    parse_obj_info(data: string): void;
    parse_element(data: string): void;
    parse_property(data: string): void;
    parse_end_header(data: string): void;
}
export declare class PlyHeaderLines implements Iterable<string> {
    private stream;
    private chars;
    private nl;
    private lenNl;
    private done;
    private lineNo;
    constructor(stream: {
        read: (n: number) => Buffer | string;
    });
    private decode;
    [Symbol.iterator](): Iterator<string>;
}
