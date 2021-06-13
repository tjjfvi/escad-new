import { $buffer } from "./$buffer"
import { Serializer } from "./Serializer"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
export const $string = new Serializer<string>({
  *s(string){
    const buffer = textEncoder.encode(string)
    yield* $buffer.s(buffer)
  },
  *d(){
    const buffer = yield* $buffer.d()
    return textDecoder.decode(buffer)
  },
})
