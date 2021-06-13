import { $array } from "./$array"
import { Serializer } from "./Serializer"
import { $string } from "./$string"
import { $tuple } from "./$tuple"

export const $record = <V>($value: Serializer<V>) => {
  const $entries = $array($tuple($string, $value))
  return new Serializer<Record<string, V>>({
    *s(value){
      const entries = Object.entries(value)
      yield* $entries.s(entries)
    },
    *d(){
      const entries = yield* $entries.d()
      return Object.fromEntries(entries)
    },
  })
}
