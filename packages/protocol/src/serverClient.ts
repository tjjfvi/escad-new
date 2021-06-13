
import { Messenger } from "@escad/messages"
import { Hash, Log } from "@escad/core"
import { RenderInfo } from "./serverRenderer"

export type ServerClientShape = {
  lookupRef(loc: readonly Hash<unknown>[]): Promise<Hash<unknown>>,
  run(params?: unknown): Promise<RenderInfo>,
}

export type ClientServerShape = {
  lookupRaw(hash: Hash<unknown>): Promise<readonly Uint8Array[] | null>,
}

export type ServerClientEvents = {
  changeObserved: [],
  info: [info: RenderInfo],
  bundleStart: [],
  bundleFinish: [hash: Hash<unknown>],
  log: [log: Hash<Log> | null],
}

export type ServerClientMessenger = Messenger<ServerClientShape, ClientServerShape, ServerClientEvents>
export type ClientServerMessenger = Messenger<ClientServerShape, ServerClientShape, ServerClientEvents>
