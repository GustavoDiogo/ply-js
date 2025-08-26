import { ByteOrder } from './types';
export declare const nativeByteOrder: ByteOrder;
export declare const byteOrderMap: Record<string, ByteOrder>;
export declare const byteOrderReverse: Record<'<' | '>' | '=', string>;
export declare const dataTypeRelation: Array<[string, string]>;
export declare const dataTypes: Record<string, string>;
export declare const dataTypeReverse: Record<string, string>;
export declare const typesList: string[];
export declare function lookupType(typeStr: string): string;
export declare function checkName(name: string): void;
export declare function checkComments(comments: string[]): void;
export declare function decodeAscii(bufOrStr: Buffer | string): string;
export declare function readArray(view: Buffer, offset: number, count: number, type: string, order: ByteOrder): {
    values: number[];
    next: number;
};
export declare function writeArray(values: number[], type: string, order: ByteOrder): Buffer;
export declare function normalizeByteOrder(text: boolean, bo: ByteOrder): ByteOrder;
export declare function expect(cond: any, message: string, line?: number): asserts cond;
