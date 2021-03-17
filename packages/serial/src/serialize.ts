/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import ieee754 from "ieee754"
import { createHash, Hash as Hasher } from "crypto"
import { endMarker, Kind } from "./utils"

export interface SerializeOptions {
  chunkSize?: number,
  chunkMinSize?: number,
  hashMap?: WeakMap<object, string>,
}

export async function* serialize(
  rootValue: unknown,
  {
    chunkSize = 1 << 14, // 16kb
    chunkMinSize = chunkSize / 2,
    hashMap,
  }: SerializeOptions = {},
){
  const valueMemo = new Map<unknown, number>()
  const hashMemo = new Map<string, number>()
  const idToHash = new Map<number, string>()
  let idN = 1
  let currentChunk: Buffer | undefined
  let currentInd = 0
  let totalPosition = 0
  const hasherStack: [value: object, hasher: Hasher, id: number, start: number][] = []
  const stack = [rootValue]
  while(stack.length) {
    const start = totalPosition
    const value = stack.pop()
    if(value === endMarker && hashMap) {
      const [value, hasher, id, start] = hasherStack.pop()!
      const hash = hasher.digest("hex")
      hasherStack[hasherStack.length - 1]?.[1].update(hash, "hex")
      const hashMemoId = hashMemo.get(hash)
      hashMap.set(value, hash)
      if(hashMemoId && unwrite(totalPosition - start)) {
        idN = id
        yield* writeId(hashMemoId)
        continue
      }
      else {
        hashMemo.set(hash, id)
        idToHash.set(id, hash)
      }
    }
    const memoId = valueMemo.get(value)
    if(memoId !== undefined) {
      yield* writeId(memoId)
      if(hashMap) {
        const hash = idToHash.get(memoId)
        if(hash) hasherStack[hasherStack.length - 1]?.[1].update(hash, "hex")
      }
      continue
    }
    if(hashMap && typeof value === "object" && value) {
      const hash = hashMap.get(value)
      const hashMemoId = hashMemo.get(hash!)
      if(hash && hashMemoId) {
        yield* writeId(hashMemoId)
        hasherStack[hasherStack.length - 1]?.[1].update(hash, "hex")
        continue
      }
    }
    const id = idN++
    let hasher = hashMap && createHash("sha256")
    let deferHasher = false
    yield* writeId(0)
    valueMemo.set(value, id)
    if(typeof value === "object" || typeof value === "function")
      if(Array.isArray(value)) {
        yield* writeKind(Kind.array, hasher)
        stack.push(endMarker, ...value)
        deferHasher = true
      }
      else if(value instanceof Buffer) {
        yield* writeKind(Kind.buffer, hasher)
        yield* write(4, buf => buf.writeUInt32LE(value.length), hasher)
        yield* writeBuffer(value, hasher)
      }
      else if(value === null)
        yield* writeKind(Kind.null, hasher)
      else {
        yield* writeKind(Kind.object, hasher)
        stack.push(endMarker)
        for(const key in value)
          stack.push(value[key as never], key)
        deferHasher = true
      }
    else if(typeof value === "string") {
      yield* writeKind(Kind.string, hasher)
      yield* write(4, buf => buf.writeUInt32LE(value.length), hasher)
      yield* write(value.length, buf => buf.write(value, "utf8"), hasher)
    }
    else if(typeof value === "number") {
      yield* writeKind(Kind.number, hasher)
      yield* write(8, buf => ieee754.write(buf, value, 0, true, 52, 8), hasher)
    }
    else if(value === undefined)
      yield* writeKind(Kind.undefined, hasher)
    else if(typeof value === "boolean")
      yield* writeKind(value ? Kind.true : Kind.false, hasher)
    else if(value === endMarker)
      yield* writeKind(Kind.end)
    else
      throw new Error(`Cannot serialize value of type "${typeof value}"`)

    if(hasher && !deferHasher && value !== endMarker) {
      const hash = hasher.digest("hex")
      idToHash.set(id, hash)
      hasherStack[hasherStack.length - 1]?.[1].update(hash, "hex")
    }

    if(hasher && deferHasher)
      hasherStack.push([value as object, hasher, id, start])
  }

  if(currentChunk)
    yield currentChunk.slice(0, currentInd)

  return

  function unwrite(length: number){
    if(length > currentInd)
      return false
    currentInd -= length
    totalPosition -= length
    return true
  }

  function writeKind(kind: Kind, hasher?: Hasher){
    return write(1, buf => buf.writeUInt8(kind), hasher)
  }

  function writeId(id: number){
    return write(4, buf => buf.writeUInt32LE(id))
  }

  async function* writeBuffer(buffer: Buffer, hasher?: Hasher){
    hasher?.update(buffer)

    if(buffer.length > chunkMinSize) {
      if(currentChunk)
        yield currentChunk.slice(0, currentInd)
      yield buffer
      currentChunk = undefined
      return
    }

    yield* write(buffer.length, buf => buffer.copy(buf))
  }

  async function* write(length: number, cb: (buffer: Buffer) => void, hasher?: Hasher){
    if(length > chunkSize) {
      if(currentChunk)
        yield currentChunk.slice(0, currentInd)
      const buffer = Buffer.allocUnsafe(length)
      cb(buffer)
      hasher?.update(buffer)
      yield buffer
      currentChunk = undefined
      return
    }

    if(currentChunk && currentInd + length > currentChunk.length) {
      yield currentChunk.slice(0, currentInd)
      currentChunk = undefined
    }

    if(!currentChunk) {
      currentChunk = Buffer.allocUnsafe(chunkSize)
      currentInd = 0
    }

    const section = currentChunk.slice(currentInd, currentInd + length)
    cb(section)
    hasher?.update(section)

    currentInd += length
    totalPosition += length
  }
}
