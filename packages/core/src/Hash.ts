
import { serialize } from "@escad/serial"
import { timers } from "./Timer"

// eslint-disable-next-line @typescript-eslint/ban-types
const hashMap = new WeakMap<object, string>()

export const Hash = {
  create: timers.hash.time(<T>(obj: T): Hash<T> =>
    serialize.hash(obj, hashMap) as Hash<T>,
  ),
  equal: (a: unknown, b: unknown) => {
    if(a === b)
      return true
    if(typeof a !== "object" || typeof b !== "object")
      return false
    if(!a || !b)
      return false
    if(a["type" as never] !== b["type" as never])
      return false
    return Hash.create(a) === Hash.create(b)
  },
  check: <T>(hash: Hash<T>, value: unknown): value is T & NonExhaustive =>
    Hash.create(value) === hash,
  hashMap,
}

export type Hash<T> = string & { __hash__: T }

declare class NonExhaustive {

 private __nonExhaustive__: never

}
