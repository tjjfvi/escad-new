/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import ieee754 from "ieee754"
import { createHash, Hash as Hasher } from "crypto"

type Hash = string

export interface SerializeOptions {
  chunkSize?: number,
  chunkMinSize?: number,
  hashMap?: WeakMap<object, Hash>,
}

enum Kind {
  null = 0,
  end = 1,
  string = 2,
  number = 3,
  false = 4,
  true = 5,
  object = 6,
  array = 7,
  buffer = 8,
  undefined = 9,
}

const endMarker = Symbol()

export async function* serialize(
  rootValue: unknown,
  {
    chunkSize = 1 << 14, // 16kb
    chunkMinSize = chunkSize / 2,
    hashMap,
  }: SerializeOptions = {},
){
  const valueMemo = new Map<unknown, number>()
  const hashMemo = new Map<Hash, number>()
  const idToHash = new Map<number, Hash>()
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

    if(hasher && !deferHasher) {
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

export interface DeserializeOptions {

}

export async function deserialize(
  stream: AsyncIterable<Buffer>,
  {}: DeserializeOptions = {},
){
  type Target = [unknown[]] | [Record<string, unknown>, string | undefined]
  const memo = new Map<number, unknown>()
  let idN = 1
  const iterator = stream[Symbol.asyncIterator]()
  const readQueue: Buffer[] = []
  let readQueueLength = 0
  const targetStack: Target[] = [[[]]]
  do {
    const target = targetStack[targetStack.length - 1]
    const value = await readValue()
    if(value === endMarker) {
      targetStack.pop()
      continue
    }
    if(target.length === 1)
      target[0].push(value)
    else if(target[1] !== undefined) {
      target[0][target[1]] = value
      target[1] = undefined
    }
    else {
      if(typeof value !== "string")
        throw new Error("Invalid key for object")
      target[1] = value
    }
  } while(targetStack.length > 1)

  return (targetStack[0][0] as unknown[])[0]

  async function readValue(): Promise<unknown>{
    let id = await readId()
    if(id)
      return memo.get(id)
    id = idN++
    const value = await _readValue()
    memo.set(id, value)
    return value
  }

  async function _readValue(): Promise<unknown>{
    const kind = await readKind()
    if(kind === Kind.array) {
      const value: unknown[] = []
      targetStack.push([value])
      return value
    }
    if(kind === Kind.object) {
      const value = {}
      targetStack.push([value, undefined])
      return value
    }
    if(kind === Kind.end)
      return endMarker
    if(kind === Kind.number)
      return ieee754.read(await read(8), 0, true, 52, 8)
    if(kind === Kind.null)
      return null
    if(kind === Kind.undefined)
      return undefined
    if(kind === Kind.string)
      return (await read((await read(4)).readUInt32LE())).toString("utf8")
    if(kind === Kind.true)
      return true
    if(kind === Kind.false)
      return false
    if(kind === Kind.buffer)
      return await read((await read(4)).readUInt32LE())
    throw new Error(`Invalid kind ${kind}`)
  }

  async function readKind(): Promise<Kind>{
    const kind = await read(1).then(buf => buf[0])
    return kind
  }

  async function readId(){
    return await read(4).then(buf => buf.readUInt32LE())
  }

  async function read(length: number){
    while(length > readQueueLength) {
      const result = await iterator.next()
      if(result.done) throw new Error("Unexpected EOF")
      readQueue.push(result.value)
      readQueueLength += result.value.length
    }

    readQueueLength -= length
    if(length === readQueue[0].length)
      return readQueue.shift()!
    if(length < readQueue[0].length) {
      const buffer = readQueue[0].slice(0, length)
      readQueue[0] = readQueue[0].slice(length)
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
    return buffer
  }
}
