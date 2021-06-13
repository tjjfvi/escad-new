
import crypto from "crypto"
import { Timer } from "./Timer"
import { $unknown } from "@escad/serial"

const hashMemo = new WeakMap<object, Hash<any>>()
export const Hash = {
  create: Timer.create().timeFn(<T>(obj: T): Hash<T> => {
    if(typeof obj === "object" && obj) {
      const memoedHash = hashMemo.get(obj as never)
      if(memoedHash) return memoedHash
    }
    const hasher = crypto.createHash("sha256")
    for(const part of $unknown.serialize(obj))
      hasher.update(part)
    const hash = hasher.digest("hex") as Hash<T>
    if(typeof obj === "object" && obj)
      hashMemo.set(obj as never, hash)
    return hash
  }),
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
}

export declare const __hash: unique symbol
export type __hash = typeof __hash
export type Hash<T> = string & { [__hash]: T }

declare class NonExhaustive {

 private __nonExhaustive__: never

}
