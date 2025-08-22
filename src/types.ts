/*
* This file is part of python-plyfile (original work Copyright © 2014-2025
Darsh Ranjan
* and plyfile authors). TypeScript port © 2025 Gustavo Diogo Silva (GitHub:
GustavoDiogo).
*
* This program is free software: you can redistribute it and/or modify it
under the
* terms of the GNU General Public License as published by the Free Software
* Foundation, either version 3 of the License, or (at your option) any later
version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License along
with this
* program. If not, see <http://www.gnu.org/licenses/>.
*/
export type ByteOrder = '<' | '>' | '=';

export interface OpenableStreamLike {
    read?(size?: number): Buffer | string;
    write?(data: Buffer | string): void;
    close?: () => void;
    tell?: () => number; // not standard; used internally when available
}

export type KnownListLen = Record<string, number>; // propertyName -> fixed length

export interface ReadOptions {
    mmap?: 'c' | 'r' | 'r+' | boolean; // accepted but ignored
    knownListLen?: Record<string, KnownListLen>; // elementName -> { propName: len }
}

export interface WriteOptions {}

export type PlyScalar = number; // JS number covers int/float
export type PlyList = number[]; // list properties

export type PlyRecord = Record<string, PlyScalar | PlyList>;

export interface ReadableBinary {
    read(size: number): Buffer;
}

export interface WritableBinary {
    write(data: Buffer): void;
}

export interface ReadableText {
    readline(): string | null; // returns one line without trailing EOL or null on EOF
}