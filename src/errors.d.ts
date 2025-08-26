export declare class PlyParseError extends Error {
}
export declare class PlyElementParseError extends PlyParseError {
    message: string;
    element?: {
        name: string;
    } | undefined;
    row?: number | null | undefined;
    prop?: {
        name: string;
    } | null | undefined;
    constructor(message: string, element?: {
        name: string;
    } | undefined, row?: number | null | undefined, prop?: {
        name: string;
    } | null | undefined);
}
export declare class PlyHeaderParseError extends PlyParseError {
    message: string;
    line?: number | undefined;
    constructor(message: string, line?: number | undefined);
}
