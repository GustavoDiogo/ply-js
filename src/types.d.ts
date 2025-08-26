export type ByteOrder = '<' | '>' | '=';
export interface OpenableStreamLike {
    read?(size?: number): Buffer | string;
    write?(data: Buffer | string): void;
    close?: () => void;
    tell?: () => number;
}
export type KnownListLen = Record<string, number>;
export interface ReadOptions {
    mmap?: 'c' | 'r' | 'r+' | boolean;
    knownListLen?: Record<string, KnownListLen>;
}
export interface WriteOptions {
}
export type PlyScalar = number;
export type PlyList = number[];
export type PlyRecord = Record<string, PlyScalar | PlyList>;
export interface ReadableBinary {
    read(size: number): Buffer;
}
export interface WritableBinary {
    write(data: Buffer): void;
}
export interface ReadableText {
    readline(): string | null;
}
