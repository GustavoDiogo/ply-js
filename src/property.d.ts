import { ByteOrder, PlyList, PlyScalar } from './types';
export declare class PlyProperty {
    private _name;
    private _valDtypeCode;
    constructor(name: string, valDtype: string);
    get name(): string;
    get valDtype(): string;
    set valDtype(val: string);
    dtype(byteOrder?: ByteOrder): string;
    _fromFields(fields: Iterator<string>): PlyScalar | PlyList;
    _toFields(value: any): Iterable<number>;
    _readBin(view: Buffer, offset: number, byteOrder: ByteOrder): {
        value: PlyScalar | PlyList;
        next: number;
    };
    _writeBin(value: PlyScalar, byteOrder: ByteOrder): Buffer;
    toString(): string;
}
export declare class PlyListProperty extends PlyProperty {
    private _lenDtypeCode;
    constructor(name: string, lenDtype: string, valDtype: string);
    get lenDtype(): string;
    set lenDtype(v: string);
    dtype(): string;
    listDtype(byteOrder?: ByteOrder): [string, string];
    _fromFields(fields: Iterator<string>): PlyList;
    _toFields(value: any): Iterable<number>;
    _readListAndAdvance(view: Buffer, offset: number, byteOrder: ByteOrder): {
        list: number[];
        next: number;
    };
    _readBin(view: Buffer, offset: number, byteOrder: ByteOrder): {
        value: PlyScalar | PlyList;
        next: number;
    };
    _writeBin(value: PlyScalar | PlyList, byteOrder: ByteOrder): Buffer;
    toString(): string;
}
