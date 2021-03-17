/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import ieee754 from "ieee754"
import { createHash, Hash as Hasher } from "crypto"
import { endMarker, Kind } from "./utils"

export interface DeserializeOptions {
  hashMap?: WeakMap<object, string>,
}

export async function deserialize(
  stream: AsyncIterable<Buffer>,
  { hashMap }: DeserializeOptions = {},
){
  type Target =
    | [unknown[], Hasher | undefined, number]
    | [Record<string, unknown>, Hasher | undefined, number, string | undefined]
  const memo = new Map<number, unknown>()
  const idToHash = new Map<number, string>()
  let idN = 1
  const iterator = stream[Symbol.asyncIterator]()
  const readQueue: Buffer[] = []
  let readQueueLength = 0
  const targetStack: Target[] = [[[], createHash("sha256"), -1]]
  do {
    const target = targetStack[targetStack.length - 1]
    const value = await readValue()
    if(value === endMarker) {
      const target = targetStack.pop()!
      const [value, hasher, id] = target
      if(hashMap && hasher) {
        const hash = hasher.digest("hex")
        hashMap.set(value, hash)
        idToHash.set(id, hash)
        targetStack[targetStack.length - 1]?.[1]?.update(hash, "hex")
      }
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
  } while(targetStack.length > 1)

  return (targetStack[0][0] as unknown[])[0]

  async function readValue(): Promise<unknown>{
    let id = await readId()
    if(id) {
      const value =  memo.get(id)
      if(value !== endMarker)
        targetStack[targetStack.length - 1]?.[1]?.update(idToHash.get(id)!, "hex")
      return value
    }
    id = idN++
    const hasher = hashMap && createHash("sha256")
    let oldTargetStackLength = targetStack.length
    const value = await _readValue(id, hasher)
    if(hashMap && hasher && oldTargetStackLength === targetStack.length) {
      const hash = hasher.digest("hex")
      idToHash.set(id, hash)
      if(typeof value === "object" && value)
        hashMap.set(value, hash)
      if(value !== endMarker)
        targetStack[targetStack.length - 1]?.[1]?.update(hash, "hex")
    }

    memo.set(id, value)
    return value
  }

  async function _readValue(id: number, hasher?: Hasher): Promise<unknown>{
    const kind = await readKind(hasher)
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
      return ieee754.read(await read(8, hasher), 0, true, 52, 8)
    if(kind === Kind.null)
      return null
    if(kind === Kind.undefined)
      return undefined
    if(kind === Kind.string)
      return (await read((await read(4, hasher)).readUInt32LE(), hasher)).toString("utf8")
    if(kind === Kind.true)
      return true
    if(kind === Kind.false)
      return false
    if(kind === Kind.buffer)
      return await read((await read(4, hasher)).readUInt32LE(), hasher)
    throw new Error(`Invalid kind ${kind}`)
  }

  async function readKind(hasher?: Hasher): Promise<Kind>{
    const buf = await read(1, hasher)
    const kind = buf[0]
    return kind
  }

  async function readId(){
    return await read(4).then(buf => buf.readUInt32LE())
  }

  async function read(length: number, hasher?: Hasher){
    while(length > readQueueLength) {
      const result = await iterator.next()
      if(result.done) throw new Error("Unexpected EOF")
      readQueue.push(result.value)
      readQueueLength += result.value.length
    }

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
