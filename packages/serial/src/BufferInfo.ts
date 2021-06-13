
export interface BufferInfo {
  buffer: Uint8Array,
  dataView: DataView,
  offset: number,
}

export const BufferInfo = {
  create: (buffer: Uint8Array, offset = 0): BufferInfo => ({
    buffer,
    dataView: new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    offset,
  }),
}
