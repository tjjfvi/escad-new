
import express from "express"
import expressWs from "express-ws"
import {
  createServerBundlerMessenger,
  createServerClientMessenger,
  createServerRendererMessenger,
} from "@escad/server"
import path from "path"
import { childProcessConnection, logConnection, serializeConnection } from "@escad/messages"
import { fork } from "child_process"
import watch from "node-watch"
import { BundleOptions, ServerRendererShape } from "@escad/protocol"
import { createServerEmitter } from "@escad/server"

export interface ServerOptions {
  artifactsDir: string,
  port: number,
  ip: string,
  loadFile: string,
  loadDir: string,
  dev: boolean,
}

export const createServer = async ({ artifactsDir, port, ip = "::", loadFile, loadDir, dev }: ServerOptions) => {
  const { app } = expressWs(express())

  const staticDir = path.join(__dirname, "../static/")
  const bundleDir = path.join(artifactsDir, "static/")

  app.use(express.static(staticDir))
  app.use(express.static(bundleDir))
  app.use("/artifacts", express.static(artifactsDir + "/"))

  const baseBundleOptions: BundleOptions = {
    outDir: bundleDir,
    coreClientPath: require.resolve("./client"),
    clientPlugins: [],
    watch: dev,
  }

  const createRendererMessenger = async (lookupRaw: ServerRendererShape["lookupRaw"]) => {
    const child = fork(require.resolve("./renderer"), {
      env: { ...process.env, ARTIFACTS_DIR: artifactsDir, LOAD_FILE: loadFile },
    })
    console.log(`New renderer process: ${child.pid}`)
    return createServerRendererMessenger(lookupRaw, serializeConnection(childProcessConnection(child)))
  }

  const loadInfo = await (await createRendererMessenger(async () => null)).loadFile()

  const bundlerProcess = fork(require.resolve("./bundler"), {
    env: { ...process.env, DEV_MODE: dev + "" },
  })
  const bundlerMessenger = createServerBundlerMessenger(childProcessConnection(bundlerProcess))

  bundlerMessenger.bundle({
    ...baseBundleOptions,
    clientPlugins: loadInfo.clientPlugins,
  })

  const serverEmitter = createServerEmitter()

  watch(loadDir, {
    filter: file => !file.includes("artifacts") && !file.includes("node_modules") && !file.includes("dist"),
  }, (event, filePath) => {
    console.log(`Watched file ${filePath} ${event}d`)
    serverEmitter.emit("changeObserved")
  })

  bundlerMessenger.on("bundleStart", () => {
    console.log("Bundle client start")
  })
  bundlerMessenger.on("bundleFinish", hash => {
    console.log(`Bundle client finish (${hash.slice(0, 32)}...)`)
  })

  serverEmitter.on("clientPlugins", clientPlugins => {
    bundlerMessenger.bundle({
      ...baseBundleOptions,
      clientPlugins,
    })
  })

  app.ws("/ws", ws => {
    const messenger = createServerClientMessenger({
      connection: logConnection(serializeConnection({
        send: msg => ws.send(msg),
        onMsg: cb => {
          ws.on("message", cb)
          return () => ws.off("message", cb)
        },
      })),
      serverEmitter,
      createRendererMessenger,
      bundlerMessenger,
    })
    ws.on("close", () => messenger.destroy())
    ws.on("error", () => messenger.destroy())
  })

  const httpServer = app.listen(port, ip, () => {
    const address = httpServer.address()
    const addressString =
    typeof address === "object" && address
      ? address.family === "IPv6"
        ? `[${address.address}]`
        : address.address
      : "<?>"
    const addressPortString = (
      typeof address === "object"
        ? address
          ? `http://${addressString}:${address.port}`
          : "<?>"
        : address
    )
    console.log(`Listening on ${addressPortString}`)
  })
}
