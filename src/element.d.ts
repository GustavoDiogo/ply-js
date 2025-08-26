import { PlyListProperty, PlyProperty } from './property';
import { ByteOrder, PlyRecord } from './types';
export declare class PlyElement {
    private _name;
    private _count;
    private _properties;
    private _propertyLookup;
    private _comments;
    private _haveList;
    data: PlyRecord[];
    constructor(name: string, properties: Array<PlyProperty | PlyListProperty>, count: number, comments?: string[]);
    get name(): string;
    get count(): number;
    get properties(): (PlyProperty | PlyListProperty)[];
    set dataArray(rows: PlyRecord[]);
    get comments(): string[];
    set comments(c: string[]);
    private _index;
    private _checkSanity;
    plyProperty(name: string): PlyProperty | PlyListProperty;
    dtype(byteOrder?: ByteOrder): Array<[string, string]>;
    header(): string;
    _read(stream: Buffer, isText: boolean, byteOrder: ByteOrder, _mmap?: any, knownListLen?: Record<string, number>): number;
    private _readTxt;
    private _readBin;
    _write(streams: {
        push: (buf: Buffer | string) => void;
    }, isText: boolean, byteOrder: ByteOrder): void;
    private _writeTxt;
    private _writeBin;
}
