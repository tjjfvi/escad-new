/* eslint-disable @typescript-eslint/no-non-null-assertion */

import ieee754 from "ieee754"

export interface SerializeOptions {
  chunkSize?: number,
  chunkMinSize?: number,
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
  }: SerializeOptions,
){
  const memo = new Map<unknown, number>()
  let idN = 1
  let currentChunk: Buffer | undefined
  let currentInd = 0
  const stack = [rootValue]
  while(true) {
    const value = stack.pop()
    if(!value) return
    const memoId = memo.get(value)
    if(memoId !== undefined) {
      yield* writeId(memoId)
      continue
    }
    const id = idN++
    yield* writeId(0)
    memo.set(value, id)
    if(typeof value === "object" || typeof value === "function") {
      if(Array.isArray(value)) {
        yield* writeKind(Kind.array)
        stack.push(endMarker, ...value)
        continue
      }
      if(value instanceof Buffer) {
        yield* writeKind(Kind.buffer)
        yield* writeBuffer(value)
      }
      if(value === null) {
        yield* writeKind(Kind.null)
        continue
      }
      stack.push(endMarker)
      for(const key in value)
        stack.push(key, value)
      continue
    }
    if(typeof value === "string") {
      yield* writeKind(Kind.string)
      yield* write(4, buf => buf.writeUInt32LE(value.length))
      yield* write(value.length, buf => buf.write(value, "utf8"))
      continue
    }
    if(typeof value === "number") {
      yield* writeKind(Kind.string)
      yield* write(8, buf => ieee754.write(buf, value, 0, true, 52, 8))
      continue
    }
    if(value === undefined) {
      yield* writeKind(Kind.undefined)
      continue
    }
    if(typeof value === "boolean") {
      yield* writeKind(value ? Kind.true : Kind.false)
      continue
    }
    if(value === endMarker) {
      yield* writeKind(Kind.end)
      continue
    }
    throw new Error(`Cannot serialize value of type "${typeof value}"`)
  }

  function writeKind(kind: Kind){
    return write(1, buf => buf.writeUInt8(kind))
  }

  function writeId(id: number){
    return write(4, buf => buf.writeUInt32LE(id))
  }

  async function* writeBuffer(buffer: Buffer){
    if(buffer.length > chunkMinSize) {
      if(currentChunk)
        yield currentChunk.slice(0, currentInd)
      yield buffer
      currentChunk = undefined
      return
    }

    yield* write(buffer.length, buf => buffer.copy(buf))
  }

  async function* write(length: number, cb: (buffer: Buffer) => void){
    if(length > chunkSize) {
      if(currentChunk)
        yield currentChunk.slice(0, currentInd)
      const buffer = Buffer.allocUnsafe(length)
      cb(buffer)
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

    cb(currentChunk.slice(currentInd, currentInd + length))

    currentInd += length
  }
}

export interface DeserializeOptions {

}

export async function deserialize(
  stream: AsyncIterable<Buffer>,
  {}: DeserializeOptions,
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
      return targetStack.pop()![0]
  }

  async function readKind(): Promise<Kind>{
    const kind = await read(1).then(buf => buf[0])
    if(!(kind in Kind))
      throw new Error(`Invalid kind ${kind}`)
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
