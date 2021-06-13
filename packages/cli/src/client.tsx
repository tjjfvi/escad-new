
import React from "react"
import ReactDOM from "react-dom"
import { App, WebSocketClientState } from "@escad/client"
import { artifactManager, InMemoryArtifactStore } from "@escad/core"

artifactManager.artifactStores.unshift(new InMemoryArtifactStore())
const state = new WebSocketClientState(
  "ws" + window.location.toString().slice(4) + "ws/",
  artifactManager,
  hash => `/artifacts/raw/${hash}`,
)
console.log(state)
ReactDOM.render(<App state={state}/>, document.getElementById("root"))

if(process.env.DEV_MODE === "true")
  state.clientStatus.on("update", () => {
    if(state.clientStatus() === "reload")
      window.location.reload()
  })
