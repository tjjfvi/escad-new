import { $uint32le } from "./$number"
import { Serializer } from "./Serializer"

export const $map = <K, V>($key: Serializer<K>, $value: Serializer<V>) => new Serializer<Map<K, V>>({
  *s(map){
    yield* $uint32le.s(map.size)
    for(const [key, value] of map.entries()) {
      yield* $key.s(key)
      yield* $value.s(value)
    }
  },
  *d(){
    const size = yield* $uint32le.d()
    const map = new Map<K, V>()
    for(let i = 0; i < size; i++)
      map.set(yield* $key.d(), yield* $value.d())
    return map
  },
})
