
import {
  brandConnection,
  createMessenger,
  filterConnection,
  mapConnection,
  noopConnection,
  workerConnection,
} from "@escad/messages"
import React from "react"
import ReactDOM from "react-dom"
import { App, ClientState } from "@escad/client"
import { artifactManager, ArtifactStore } from "@escad/core"
import { createServerClientMessenger } from "@escad/server"
import { mdiExportVariant, mdiPencil } from "@mdi/js"
import { InMemoryArtifactStore } from "../utils/InMemoryArtifactStore"
import { createBlob } from "../utils/createBlob"
import { ServerRendererMessenger } from "@escad/protocol"
import { createServerEmitter } from "@escad/server"

const isRun = location.host === "escad.run" || (location.pathname.startsWith("/run"))

if(isRun) {
  const [serverClient, clientServer] = noopConnection()

  const artifactStore = new InMemoryArtifactStore()

  const workerSource = createBlob(
    `importScripts("${location.origin}/static/bundled/escad.js","${location.href}renderer.bundle.js")`,
  )

  createServerClientMessenger({
    connection: mapConnection.log(serverClient),
    hashToUrl: hash => createBlob(artifactStore.raw.get(hash) ?? new Uint8Array(0)),
    createRendererMessenger: async () => {
      const worker = new Worker(workerSource)
      const artifactMessenger = createMessenger<Required<ArtifactStore>, {}, {}>({
        impl: artifactStore,
        connection: brandConnection(workerConnection(worker), "artifacts"),
      })
      const messenger: ServerRendererMessenger = createMessenger({
        impl: {},
        connection: mapConnection.log(brandConnection(workerConnection(worker), "renderer")),
        onDestroy: [artifactMessenger.destroy],
      })
      return messenger
    },
    serverEmitter: createServerEmitter(),
  })

  const clientState = new ClientState(clientServer, artifactManager)
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
            icon: mdiPencil,
            onClick: () => location.href = info.url,
          },
        },
        state: () => "fork",
      })
  })
}

if(!isRun) {
  const baseConnection = mapConnection(
    filterConnection({
      send: msg => window.parent.postMessage(msg, "*"),
      onMsg: cb => window.addEventListener("message", cb),
      offMsg: cb => window.removeEventListener("message", cb),
    }, (ev: any): ev is unknown => ev.origin === location.origin),
    x => x,
    (ev: any) => ev.data,
  )
  const clientState = new ClientState(brandConnection(baseConnection, "client"), artifactManager)
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
        icon: mdiExportVariant,
        onClick: () => {
          saveMessenger.share()
        },
      },
    },
    state: () => "share",
  })
  clientState.connect()
  ReactDOM.render(<App state={clientState}/>, document.getElementById("root"))
}
