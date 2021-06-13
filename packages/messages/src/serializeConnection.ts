
import { createEventEmitter } from "."
import { $unknown } from "../../serial/dist"
import { Connection  } from "./Connection"
import { transformConnection } from "./transformConnection"

export const serializeConnection = (_connection: Connection<Uint8Array, unknown>): Connection<unknown> => {
  const connection: Connection<Uint8Array> = transformConnection(_connection, x => x, v => {
    if(v instanceof Uint8Array) return v
    if(v instanceof ArrayBuffer) return new Uint8Array(v)
    if(typeof v === "object" && v && !("length" in v))
      return new Uint8Array({ ...v, length: Object.keys(v).length })
    return new Uint8Array(v as any)
  })
  const ee = createEventEmitter<{
    send: [unknown],
    recv: [unknown],
    _send: [Uint8Array],
    _recv: [Uint8Array],
  }>()
  ee.on("_send", connection.send)
  ee.emit("_send", wrap($unknown.serializeStreamAsync(unwrap(ee.on("send")))))
  connection.onMsg(value => ee.emit("_recv", value))
  ee.emit("recv", wrap($unknown.deserializeStreamAsync(unwrap(ee.on("_recv")))))
  return {
    send: v => ee.emit("send", v),
    onMsg: origCb => ee.on("recv", x => origCb(x)),
    destroy: () => {
      connection.destroy?.()
      ee.destroy()
    },
  }
}

async function* unwrap<T>(iterable: AsyncIterable<readonly [T]>): AsyncIterable<T>{
  for await (const [value] of iterable)
    yield value
}

async function* wrap<T>(iterable: AsyncIterable<T>): AsyncIterable<[T]>{
  for await (const value of iterable)
    yield [value]
}
