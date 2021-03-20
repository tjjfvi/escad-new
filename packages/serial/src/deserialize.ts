/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import ieee754 from "ieee754"
import { createHash, Hash as Hasher } from "crypto"
import { endMarker, Kind } from "./utils"

export interface DeserializeOptions {
  hashMap?: WeakMap<object, string>,
}

export async function deserialize(stream: AsyncIterable<Buffer>, options?: DeserializeOptions){
  return (await deserializeWithHash(stream, options)).value
}

deserialize.withHash = deserializeWithHash
deserialize.sync = deserializeSync
deserializeSync.withHash = deserializeSyncWithHash

export async function deserializeSync(stream: Iterable<Buffer>, options?: DeserializeOptions){
  return deserializeSyncWithHash(stream, options).value
}

async function deserializeWithHash(stream: AsyncIterable<Buffer>, options?: DeserializeOptions){
  const deser = _deserialize(options)
  const iterator = stream[Symbol.asyncIterator]()
  let result = deser.next()
  while(!result.done) {
    const { value, done } = await iterator.next()
    result = deser.next(done ? undefined : value)
  }
  return result.value
}

function deserializeSyncWithHash(stream: Iterable<Buffer>, options?: DeserializeOptions){
  const deser = _deserialize(options)
  const iterator = stream[Symbol.iterator]()
  let result = deser.next()
  do {
    const { value, done } = iterator.next()
    result = deser.next(done ? undefined : value)
  } while(!result.done)
  return result.value
}

type Deser<T> = Generator<undefined, T, Buffer | undefined>

function* _deserialize({ hashMap }: DeserializeOptions = {}): Deser<{ value: unknown, hash: string }>{
  type Target =
    | [unknown[], Hasher | undefined, number]
    | [Record<string, unknown>, Hasher | undefined, number, string | undefined]
  const memo = new Map<number, unknown>()
  const idToHash = new Map<number, string>()
  let idN = Kind.MAX + 1
  const readQueue: Buffer[] = []
  let readQueueLength = 0
  const targetStack: Target[] = []
  let outValue: { value: unknown, hash: string | undefined } | undefined
  while(true) {
    const target = targetStack[targetStack.length - 1]
    const oldTargetStackLength = targetStack.length
    let value: unknown
    let hash: string | undefined
    const hasher = hashMap && createHash("sha256")
    let id = yield* readId(hasher)
    if(id > Kind.MAX) {
      value = memo.get(id)
      hash = idToHash.get(id)
    }
    else {
      const kind = id
      id = idN++
      value = yield* readValue(id, kind, hasher)
      if(hashMap && hasher && oldTargetStackLength === targetStack.length) {
        hash = hasher.digest("hex")
        idToHash.set(id, hash)
        if(typeof value === "object" && value)
          hashMap.set(value, hash)
      }
      memo.set(id, value)
    }
    if(hash && value !== endMarker) target[1]?.update(hash, "hex")
    if(value === endMarker) {
      targetStack.pop()
      const [value, hasher, id] = target
      if(hashMap && hasher) {
        const hash = hasher.digest("hex")
        hashMap.set(value, hash)
        idToHash.set(id, hash)
        targetStack[targetStack.length - 1]?.[1]?.update(hash, "hex")
        if(!targetStack.length && outValue)
          outValue.hash = hash
      }
      if(!targetStack.length)
        break
      continue
    }
    if(!target) {
      outValue = { value, hash }
      continue
    }
    if(target.length === 3)
      target[0].push(value)
    else if(target[3] !== undefined) {
      target[0][target[3]] = value
      target[3] = undefined
    }
    else {
      if(typeof value !== "string")
        throw new Error("Invalid key for object")
      target[3] = value
    }
  }

  return { value: outValue!.value, hash: outValue!.hash! }

  function* readValue(id: number, kind: Kind, hasher?: Hasher): Deser<unknown>{
    if(kind === Kind.array) {
      const value: unknown[] = []
      targetStack.push([value, hasher, id])
      return value
    }
    if(kind === Kind.object) {
      const value = {}
      targetStack.push([value, hasher, id, undefined])
      return value
    }
    if(kind === Kind.end)
      return endMarker
    if(kind === Kind.number)
      return ieee754.read(yield* read(8, hasher), 0, true, 52, 8)
    if(kind === Kind.null)
      return null
    if(kind === Kind.undefined)
      return undefined
    if(kind === Kind.string)
      return (yield* read((yield* read(4, hasher)).readUInt32LE(0), hasher)).toString("utf8")
    if(kind === Kind.true)
      return true
    if(kind === Kind.false)
      return false
    if(kind === Kind.buffer)
      return yield* read((yield* read(4, hasher)).readUInt32LE(0), hasher)
    throw new Error(`Invalid kind ${kind}`)
  }

  function* readId(hasher?: Hasher): Deser<number>{
    const buf = yield* read(4)
    const id = buf.readUInt32LE(0)
    if(id <= Kind.MAX)
      hasher?.update(buf)
    return id
  }

  function* peek(length: number): Deser<boolean>{
    while(length > readQueueLength) {
      const buffer = yield void 0
      if(!buffer) return false
      if(buffer.length)
        readQueue.push(buffer)
      readQueueLength += buffer.length
    }
    return true
  }

  function* read(length: number, hasher?: Hasher): Deser<Buffer>{
    if(!(yield* peek(length)))
      throw new Error("Unexpected EOF")

    readQueueLength -= length
    if(length === readQueue[0].length) {
      const buffer = readQueue.shift()!
      hasher?.update(buffer)
      return buffer
    }
    if(length < readQueue[0].length) {
      const buffer = readQueue[0].slice(0, length)
      readQueue[0] = readQueue[0].slice(length)
      hasher?.update(buffer)
      return buffer
    }
    const buffer = Buffer.allocUnsafe(length)
    let writtenLength = 0
    while(writtenLength < length) {
      if(length - writtenLength >= readQueue[0].length) {
        writtenLength += readQueue[0].length
          readQueue.shift()!.copy(buffer, writtenLength)
          continue
      }
      readQueue[0].copy(buffer, writtenLength, 0, length - writtenLength)
      readQueue[0] = readQueue[0].slice(writtenLength - length)
      break
    }
    hasher?.update(buffer)
    return buffer
  }
}
