import { $uint32le } from "./$number"
import { Serializer } from "./Serializer"

export const $set = <T>($value: Serializer<T>) => new Serializer<Set<T>>({
  *s(set){
    yield* $uint32le.s(set.size)
    for(const value of set)
      yield* $value.s(value)
  },
  *d(){
    const size = yield* $uint32le.d()
    const set = new Set<T>()
    for(let i = 0; i < size; i++)
      set.add(yield* $value.d())
    return set
  },
})
