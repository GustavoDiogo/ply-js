import { ByteOrder } from './types';

export function writeBinaryScalar(
  buffer: Buffer,
  offset: number,
  value: number,
  type: string,
  byteOrder: ByteOrder
): number {
  switch (type) {
    case 'int8': buffer.writeInt8(value, offset); return offset + 1;
    case 'uint8': buffer.writeUInt8(value, offset); return offset + 1;
    case 'int16': return byteOrder === '<'
      ? buffer.writeInt16LE(value, offset)
      : buffer.writeInt16BE(value, offset), offset + 2;
    case 'uint16': return byteOrder === '<'
      ? buffer.writeUInt16LE(value, offset)
      : buffer.writeUInt16BE(value, offset), offset + 2;
    case 'int32': return byteOrder === '<'
      ? buffer.writeInt32LE(value, offset)
      : buffer.writeInt32BE(value, offset), offset + 4;
    case 'uint32': return byteOrder === '<'
      ? buffer.writeUInt32LE(value, offset)
      : buffer.writeUInt32BE(value, offset), offset + 4;
    case 'float32': return byteOrder === '<'
      ? buffer.writeFloatLE(value, offset)
      : buffer.writeFloatBE(value, offset), offset + 4;
    case 'float64': return byteOrder === '<'
      ? buffer.writeDoubleLE(value, offset)
      : buffer.writeDoubleBE(value, offset), offset + 8;
    default:
      throw new Error(`Unsupported scalar type for binary write: ${type}`);
  }
}

export function readBinaryScalar(
  buffer: Buffer,
  offset: number,
  type: string,
  byteOrder: ByteOrder
): [number, number] {
  switch (type) {
    case 'int8': return [buffer.readInt8(offset), offset + 1];
    case 'uint8':
    case 'uchar':
      return [buffer.readUInt8(offset), offset + 1];
    case 'int16': return byteOrder === '<'
      ? [buffer.readInt16LE(offset), offset + 2]
      : [buffer.readInt16BE(offset), offset + 2];
    case 'uint16': return byteOrder === '<'
      ? [buffer.readUInt16LE(offset), offset + 2]
      : [buffer.readUInt16BE(offset), offset + 2];
    case 'int32':
    case 'int':
      return byteOrder === '<'
        ? [buffer.readInt32LE(offset), offset + 4]
        : [buffer.readInt32BE(offset), offset + 4];
    case 'uint32': return byteOrder === '<'
      ? [buffer.readUInt32LE(offset), offset + 4]
      : [buffer.readUInt32BE(offset), offset + 4];
    case 'float32':
    case 'float':
      return byteOrder === '<'
        ? [buffer.readFloatLE(offset), offset + 4]
        : [buffer.readFloatBE(offset), offset + 4];
    case 'float64':
    case 'double':
      return byteOrder === '<'
        ? [buffer.readDoubleLE(offset), offset + 8]
        : [buffer.readDoubleBE(offset), offset + 8];
    default:
      throw new Error(`Unsupported scalar type for binary read: ${type}`);
  }
} 