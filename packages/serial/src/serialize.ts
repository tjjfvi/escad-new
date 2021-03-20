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

export function serialize(rootValue: unknown, options?: SerializeOptions){
  return _serialize(rootValue, options)
}

serialize.hash = (value: unknown, hashMap: WeakMap<object, string>) => {
  const iterator = serialize(value, { hashMap })
  while(true) {
    const result = iterator.next()
    if(result.done)
      return result.value!
  }
}

function* _serialize(
  rootValue: unknown,
  {
    chunkSize = 1 << 14, // 16kb
    chunkMinSize = chunkSize / 2,
    hashMap,
  }: SerializeOptions = {},
){
  const valueMemo = new Map<unknown, number | null>()
  const hashMemo = new Map<unknown, number>()
  const idToHash = new Map<number, string>()
  let idN = Kind.MAX + 1
  let currentChunk: Buffer | undefined
  let currentInd = 0
  let totalPosition = 0
  let rootHash: string | undefined
  const stack = [rootValue]
  const hasherStack: [value: object, hasher: Hasher, id: number, start: number][] = []
  while(stack.length) {
    const start = totalPosition
    const value = stack.pop()
    if(value === endMarker && hashMap) {
      const [value, hasher, id, start] = hasherStack.pop()!
      const hash = hasher.digest("hex")
      if(!hasherStack.length)
        rootHash = hash
      else
        hasherStack[hasherStack.length - 1][1].update(hash, "hex")
      const hashMemoId = hashMemo.get(hash)
      valueMemo.set(value, id)
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
      if(memoId === null)
        throw new Error("Attempted to serialize circular value")
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
    valueMemo.set(value, id)
    if(typeof value === "object" || typeof value === "function")
      if(Array.isArray(value)) {
        yield* writeKind(Kind.array, hasher)
        stack.push(endMarker)
        for(let i = value.length - 1; i >= 0; i--)
          stack.push(value[i])
        deferHasher = true
      }
      else if(value instanceof Buffer) {
        yield* writeKind(Kind.buffer, hasher)
        yield* write(4, buf => buf.writeUInt32LE(value.length, 0), hasher)
        yield* writeBuffer(value, hasher)
      }
      else if(value === null)
        yield* writeKind(Kind.null, hasher)
      else {
        yield* writeKind(Kind.object, hasher)
        stack.push(endMarker)
        const keys = Object.keys(value)
        for(let i = keys.length - 1; i >= 0; i--)
          stack.push(value[keys[i] as never], keys[i])
        deferHasher = true
      }
    else if(typeof value === "string") {
      yield* writeKind(Kind.string, hasher),
      yield* write(4, buf => buf.writeUInt32LE(value.length, 0), hasher)
      yield* write(value.length, buf => buf.write(value, 0, "utf8"), hasher)
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
      yield* writeKind(Kind.end, hasher)
    else
      throw new Error(`Cannot serialize value of type "${typeof value}"`)

    if(deferHasher)
      valueMemo.set(value, null)

    if(hasher && !deferHasher && value !== endMarker) {
      const hash = hasher.digest("hex")
      idToHash.set(id, hash)
      if(!hasherStack.length)
        rootHash = hash
      else
        hasherStack[hasherStack.length - 1][1].update(hash, "hex")
    }

    if(hasher && deferHasher)
      hasherStack.push([value as object, hasher, id, start])
  }

  if(currentChunk)
    yield currentChunk.slice(0, currentInd)

  return rootHash

  function unwrite(length: number){
    if(length > currentInd)
      return false
    currentInd -= length
    totalPosition -= length
    return true
  }

  function writeKind(kind: Kind, hasher?: Hasher){
    return write(4, buf => buf.writeUInt32LE(kind, 0), hasher)
  }

  function writeId(id: number){
    return write(4, buf => buf.writeUInt32LE(id, 0))
  }

  function* writeBuffer(buffer: Buffer, hasher?: Hasher){
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

  function* write(length: number, cb: (buffer: Buffer) => void, hasher?: Hasher){
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
