
import {
  brandConnection,
  createMessenger,
  filterConnection,
  logConnection,
  createConnectionPair,
  transformConnection,
  workerConnection,
} from "@escad/messages"
import React from "react"
import ReactDOM from "react-dom"
import { App, ClientState } from "@escad/client"
import { artifactManager, ArtifactStore, InMemoryArtifactStore } from "@escad/core"
import { createServerClientMessenger } from "@escad/server"
import { createBlob } from "../utils/createBlob"
import { ServerRendererMessenger } from "@escad/protocol"
import { createServerEmitter } from "@escad/server"
import { mdi } from "@escad/client"
import { observable } from "rhobo"

const isRun = location.host === "escad.run" || (location.pathname.startsWith("/run"))

if(isRun) {
  const [serverClient, clientServer] = createConnectionPair()

  const artifactStore = new InMemoryArtifactStore()

  const workerSource = createBlob(
    `importScripts("${location.origin}/static/bundled/escad.js","${location.href}renderer.bundle.js")`,
  )

  createServerClientMessenger({
    connection: logConnection(serverClient),
    createRendererMessenger: async lookupRaw => {
      const worker = new Worker(workerSource)
      const artifactMessenger = createMessenger<Required<ArtifactStore>, {}, {}>({
        impl: artifactStore,
        connection: brandConnection(workerConnection(worker), "artifacts"),
      })
      const messenger: ServerRendererMessenger = createMessenger({
        impl: { lookupRaw },
        connection: logConnection(brandConnection(workerConnection(worker), "renderer")),
        onDestroy: [artifactMessenger.destroy],
      })
      return messenger
    },
    serverEmitter: createServerEmitter(),
  })

  const clientState = new ClientState(
    clientServer,
    artifactManager,
    // @ts-ignore: todo
    hash => createBlob(artifactStore.raw.get(hash) ?? new Uint8Array(0)),
  )
  clientState.removeStatusSet("Connection")
  clientState.removeStatusSet("Client")
  clientState.connect()
  ReactDOM.render(<App state={clientState}/>, document.getElementById("root"))

  fetch("info.json").then(r => r.json()).then(info => {
    if(info.url)
      clientState.addStatusSet({
        name: "Fork",
        statuses: {
          fork: {
            name: "Fork",
            icon: mdi.pencil,
            onClick: () => location.href = info.url,
          },
        },
        state: observable("fork"),
      })
  })
}

if(!isRun) {
  const baseConnection = transformConnection(
    filterConnection({
      send: msg => window.parent.postMessage(msg, "*"),
      onMsg: cb => {
        window.addEventListener("message", cb)
        return () => window.removeEventListener("message", cb)
      },
    }, (ev: any): ev is unknown => ev.origin === location.origin),
    x => x,
    (ev: any) => ev.data,
  )
  const clientState = new ClientState(brandConnection(baseConnection, "client"), artifactManager, () => "todo")
  const saveMessenger = createMessenger<{}, { share(): Promise<void> }, {}>({
    impl: {},
    connection: brandConnection(baseConnection, "share"),
  })
  clientState.removeStatusSet("Connection")
  clientState.addStatusSet({
    name: "Share",
    statuses: {
      share: {
        name: "Share",
        icon: mdi.exportVariant,
        onClick: () => {
          saveMessenger.share()
        },
      },
    },
    state: observable("share"),
  })
  clientState.connect()
  ReactDOM.render(<App state={clientState}/>, document.getElementById("root"))
}
