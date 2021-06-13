
import { $string } from "./$string"
import { Serializer } from "./Serializer"

export const $json = new Serializer<any>({
  s: value => $string.s(JSON.stringify(value)),
  *d(){
    return JSON.parse(yield* $string.d())
  },
})
