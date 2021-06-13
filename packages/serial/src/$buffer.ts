import { $uint32le } from "./$number"
import { Serializer } from "./Serializer"

export const $buffer = new Serializer<Uint8Array>({
  *s(value){
    yield* $uint32le.s(value.byteLength)
    yield* Serializer.write(value.byteLength, ({ buffer, offset }) =>
      buffer.set(value, offset),
    )
  },
  *d(){
    const length = yield* $uint32le.d()
    return yield* Serializer.read(length, ({ buffer, offset }) =>
      new Uint8Array(buffer.buffer, buffer.byteOffset + offset, length),
    )
  },
})
