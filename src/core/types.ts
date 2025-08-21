export type ByteOrder = '<' | '>' | '=';

export const ByteOrderMap: Record<string, ByteOrder> = {
  ascii: '=',
  binary_little_endian: '<',
  binary_big_endian: '>',
};

export const ByteOrderReverse: Record<ByteOrder, string> = {
  '<': 'binary_little_endian',
  '>': 'binary_big_endian',
  '=': 'ascii', // not really a byte order but for convenience
};

export const NativeByteOrder: ByteOrder =
  Buffer.alloc(2).writeInt16LE(256, 0) === 256 ? '<' : '>';

export const DataTypeRelation: [string, string][] = [
  ['int8', 'Int8'],
  ['char', 'Int8'],
  ['uint8', 'Uint8'],
  ['uchar', 'Uint8'],
  ['int16', 'Int16'],
  ['short', 'Int16'],
  ['uint16', 'Uint16'],
  ['ushort', 'Uint16'],
  ['int32', 'Int32'],
  ['int', 'Int32'],
  ['uint32', 'Uint32'],
  ['uint', 'Uint32'],
  ['float32', 'Float32'],
  ['float', 'Float32'],
  ['float64', 'Float64'],
  ['double', 'Float64'],
];

export const PlyToTypedArray: Record<string, string> = Object.fromEntries(
  DataTypeRelation
);

export const TypedArrayToPly: Record<string, string> = Object.fromEntries(
  DataTypeRelation.map(([k, v]) => [v, k])
);

export const PlyJsTypes: string[] = Array.from(
  new Set(DataTypeRelation.flat())
);
