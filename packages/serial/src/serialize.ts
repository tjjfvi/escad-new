/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import ieee754 from "ieee754"
import { endMarker, Hasher, Kind, Stack } from "./utils"

export interface SerializeOptions {
  chunkSize?: number,
  chunkMinSize?: number,
  hashMap?: WeakMap<object, string>,
  hasher?: () => Hasher,
}

export function serialize(rootValue: unknown, options?: SerializeOptions){
  return _serialize(rootValue, options)
}

serialize.hash = (value: unknown, hashMap: WeakMap<object, string>, hasher?: () => Hasher) => {
  const iterator = serialize(value, { hashMap, hasher })
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
    hasher: createHasher = Hasher.crypto,
  }: SerializeOptions = {},
){
  type HasherStackElement = {
    value: object,
    hasher: Hasher,
    id: number,
    start: number,
  }
  const valueMemo = new Map<unknown, number | null>()
  const hashMemo = new Map<unknown, number>()
  const idToHash = new Map<number, string>()
  let idN = Kind.MAX + 1
  let currentChunk: Buffer | undefined
  let currentInd = 0
  let totalPosition = 0
  let rootHash: string | undefined
  const valueStack = new Stack()
  valueStack.push(rootValue)
  const hasherStack = new Stack<HasherStackElement>()
  for(const value of valueStack) {
    const start = totalPosition

    if(value === endMarker && (yield* popHasher()))
      continue
    if(yield* checkValueMemo(value))
      continue
    if(yield* checkHashMemo(value))
      continue

    const id = idN++
    valueMemo.set(value, id)
    const prevValueStack = valueStack.length
    let hasher = hashMap && createHasher()

    yield* writeValue(value)

    if(!hasher || value === endMarker)
      continue

    const leaf = valueStack.length === prevValueStack

    if(leaf) {
      const hash = hasher.digest()
      idToHash.set(id, hash)
      pushHash(hash)
    }
    else {
      valueMemo.set(value, null)
      hasherStack.push({ value: value as object, hasher, id, start })
    }
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

  function* popHasher(){
    if(!hashMap)
      return false
    const { value, hasher, id, start } = hasherStack.pop()!
    const hash = hasher.digest()
    pushHash(hash)
    const hashMemoId = hashMemo.get(hash)
    valueMemo.set(value, id)
    hashMap!.set(value, hash)
    if(hashMemoId && unwrite(totalPosition - start)) {
      valueMemo.set(value, hashMemoId)
      idN = id
      yield* writeId(hashMemoId)
      return true
    }
    else {
      hashMemo.set(hash, id)
      idToHash.set(id, hash)
      return false
    }
  }

  function* checkValueMemo(value: unknown){
    const memoId = valueMemo.get(value)
    if(memoId !== undefined) {
      if(memoId === null)
        throw new Error("Attempted to serialize circular value")
      yield* writeId(memoId)
      if(hashMap) {
        const hash = idToHash.get(memoId)
        if(hash) pushHash(hash)
      }
      return true
    }
    return false
  }

  function* checkHashMemo(value: unknown){
    if(!hashMap || typeof value !== "object" || !value)
      return false
    const hash = hashMap.get(value)
    const hashMemoId = hashMemo.get(hash!)
    if(hash && hashMemoId) {
      yield* writeId(hashMemoId)
      pushHash(hash)
      return true
    }
  }

  function* writeValue(value: unknown, hasher?: Hasher){
    if(typeof value === "object" || typeof value === "function")
      if(Array.isArray(value)) {
        yield* writeKind(Kind.array, hasher)
        valueStack.push(endMarker)
        for(let i = value.length - 1; i >= 0; i--)
          valueStack.push(value[i])
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
        valueStack.push(endMarker)
        const keys = Object.keys(value)
        for(let i = keys.length - 1; i >= 0; i--)
          valueStack.push(value[keys[i] as never], keys[i])
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
  }

  function pushHash(hash: string){
    if(!hasherStack.length)
      rootHash = hash
    else
      hasherStack.peek()!.hasher.update(hash)
  }
}
