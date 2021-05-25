
import crypto from "crypto"
import { timers } from "./Timer"
import { $unknown } from "@escad/serial"

export const Hash = {
  create: timers.hash.time(<T>(obj: T): Hash<T> => {
    const hasher = crypto.createHash("sha256")
    for(const part of $unknown.serialize(obj))
      hasher.update(part)
    const hash = hasher.digest("hex") as Hash<T>
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
