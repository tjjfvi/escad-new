import { $uint32le } from "./$number"
import { Deserialization, Serializer } from "./Serializer"

export const $array = <T>($value: Serializer<T>) => new Serializer<readonly T[]>({
  *s(array: readonly T[]){
    yield* $uint32le.s(array.length)
    for(let i = 0; i < array.length; i++)
      yield* $value.s(array[i])
  },
  *d(): Deserialization<T[]>{
    const length = yield* $uint32le.d()
    const array = Array<T>(length)
    for(let i = 0; i < length; i++)
      array[i] = yield* $value.d()
    return array
  },
})
