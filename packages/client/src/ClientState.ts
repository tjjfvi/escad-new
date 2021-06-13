
import { ClientServerMessenger, RenderInfo } from "@escad/protocol"
import { computed, observable } from "rhobo"
import {
  ArtifactManager,
  ArtifactStore,
  ExportTypeInfo,
  Hash,
  Hierarchy,
  Product,
  Log,
  $wrappedValue,
  WrappedValue,
} from "@escad/core"
import { ObjectParam } from "@escad/core"
import { createContext } from "react"
import {
  Connection,
  createMessenger,
  logConnection,
  createConnectionPair,
  serializeConnection,
} from "@escad/messages"
import { StatusSet } from "./Status"
import { HierarchySelection, resolveHierarchySelection } from "./HierarchySelection"
import { Loading } from "./Loading"
import { mdi } from "./Icon"
import crypto from "crypto"

const lookupRawRetryTimer = 500

const _ClientStateContext = createContext<ClientState>(null as never)

export class ClientState implements ArtifactStore {

  static Context = _ClientStateContext

  bundleHash = fetch("/bundle.hash").then(r => r.text()).catch(() => null)
  serverStatus = observable<"connected" | "disconnected" | "connecting">("disconnected")
  clientStatus = observable<"current" | "bundling" | "reload">("current")
  renderJobsPending = observable(0)
  rendererStatus = observable<"unknown" | "running" | "ready">("unknown")
  viewerStatus = observable<"converting" | "displayed">("displayed")
  statuses = observable<StatusSet[]>([
    {
      name: "Renderer",
      icon: mdi.cubeOutline,
      statuses: {
        rendered: {
          className: "good",
          name: "Rendered",
          icon: mdi.check,
        },
        rendering: {
          className: "active",
          name: "Rendering",
          icon: Loading,
        },
        awaiting: {
          className: "inactive",
          name: "Awaiting",
          icon: Loading,
        },
        unknown: {
          className: "inactive",
          name: "Unknown",
          icon: mdi.help,
        },
      },
      state: computed(() => {
        if(this.serverStatus() !== "connected")
          return this.renderJobsPending() ? "awaiting" : "unknown"
        return this.renderJobsPending() ? "rendering" : "rendered"
      }),
    },
    {
      name: "Connection",
      icon: mdi.arrowUpDown,
      statuses: {
        connected: {
          className: "good",
          name: "Connected",
          icon: mdi.check,
        },
        disconnected: {
          className: "bad",
          name: "Disconnected",
          icon: mdi.close,
        },
        connecting: {
          className: "unknown",
          name: "Connecting",
          icon: Loading,
        },
      },
      state: this.serverStatus,
    },
    {
      name: "Client",
      icon: mdi.account,
      statuses: {
        current: {
          className: "good",
          name: "Up to Date",
          icon: mdi.check,
        },
        bundling: {
          className: "unknown",
          name: "Bundling",
          icon: Loading,
        },
        reload: {
          className: "attention",
          name: "Reload",
          icon: mdi.refresh,
          onClick: () => window.location.reload(),
        },
        unknown: {
          className: "inactive",
          name: "Unknown",
          icon: mdi.help,
        },
      },
      state: computed(() => {
        if(this.serverStatus() !== "connected") return "unknown"
        return this.clientStatus()
      }),
    },
    {
      name: "Viewer",
      icon: mdi.axisArrow,
      statuses: {
        displayed: {
          className: "good",
          name: "Displayed",
          icon: mdi.check,
        },
        converting: {
          className: "active",
          name: "Converting",
          icon: Loading,
        },
        awaiting: {
          className: "inactive",
          name: "Awaiting",
          icon: Loading,
        },
      },
      state: computed(() => {
        if(this.viewerStatus() === "displayed" || this.serverStatus() === "connected")
          return this.viewerStatus()
        return "awaiting"
      }),
    },
  ])

  sentProductHashes = observable<readonly Hash<Product>[]>([])
  selection = observable<HierarchySelection>()
  products = observable<Product[]>([])
  exportTypes = observable<readonly ExportTypeInfo[]>([])
  paramDef = observable<ObjectParam<any>>()
  params = observable<Record<string, unknown>>({})
  hierarchy = observable<Hierarchy>()
  logs = observable<Promise<Log>[]>([])
  sendParams = false

  productHashes = computed<readonly Hash<Product>[]>(() => {
    const selection = this.selection()
    if(!selection) return this.sentProductHashes()
    const hierarchy = this.hierarchy()
    if(!hierarchy) return []
    return [...resolveHierarchySelection(selection, hierarchy)]
  })

  clientServerMessenger: ClientServerMessenger

  constructor(
    public connection: Connection<unknown>,
    public artifactManager: ArtifactManager,
    public hashToUrl: (hash: Hash<unknown>) => string,
  ){
    const excludeStores = new Set([this])
    this.clientServerMessenger = createMessenger({
      impl: {
        lookupRaw: async hash => {
          const result = await this.artifactManager.lookupRawWrapped(hash, excludeStores)
          if(!result) return null
          return [...$wrappedValue.serialize(result)]
        },
      },
      connection: logConnection(this.connection),
    })
    this.artifactManager.artifactStores.unshift(this)

    this.productHashes.on("update", async () => {
      this.products(
        await Promise.all(this.productHashes().map(async hash => {
          const product = await this.artifactManager.lookupRaw(hash)
          if(!product)
            throw new Error("Could not find Product under hash of " + hash)
          return product
        })),
      )
    })

    this.clientServerMessenger.on("changeObserved", async () => {
      this.wrapRendering(async () => {
        const runParams = this.sendParams ? this.params() : null
        console.log("Run with params:", { runParams })
        this.clientServerMessenger.run(runParams)
        await this.clientServerMessenger.once("info")
      })
    })

    this.clientServerMessenger.on("bundleStart", async () => {
      this.clientStatus("bundling")
    })

    this.clientServerMessenger.on("bundleFinish", async newBundleHash => {
      this.clientStatus(newBundleHash === await this.bundleHash ? "current" : "reload")
    })

    this.clientServerMessenger.on("info", info => {
      this.handleProducts(info.products)
      this.handleParamDef(info.paramDef)
      this.handleHierarchy(info.hierarchy)
      this.handleExportTypes(info.exportTypes)
    })

    this.clientServerMessenger.on("log", logHash => {
      if(!logHash)
        this.logs([])
      else
        this.logs([...this.logs(), this.lookupLog(logHash)])
    })
  }

  async lookupLog(logHash:Hash<Log>){
    const log = await this.artifactManager.lookupRaw(logHash)
    if(!log)
      throw new Error(`Could not find log under hash of ${logHash}`)
    return log
  }

  removeStatusSet(name: string){
    this.statuses(this.statuses().filter(statusSet => statusSet.name !== name))
  }

  addStatusSet(statusSet: StatusSet){
    this.statuses([...this.statuses(), statusSet])
  }

  connect(){
    this.logs([])
    this.clientServerMessenger.retryAll()
    this.clientServerMessenger.emit("changeObserved")
  }

  public async handleProducts(productHashes: RenderInfo["products"]){
    this.sentProductHashes(productHashes)
  }

  private async handleExportTypes(exportTypes: RenderInfo["exportTypes"]){
    if(exportTypes)
      this.exportTypes(exportTypes)
  }

  private async handleParamDef(paramDefHash: RenderInfo["paramDef"]){
    this.paramDef(paramDefHash ? await this.artifactManager.lookupRaw(paramDefHash) : null)
  }

  private async handleHierarchy(hierarchyHash: RenderInfo["hierarchy"]){
    this.hierarchy(hierarchyHash ? await this.artifactManager.lookupRaw(hierarchyHash) : null)
  }

  async lookupRaw(hash: Hash<unknown>): Promise<WrappedValue<unknown> | null>{
    return this.wrapRendering(async () => {
      console.log("lookupRaw", hash)
      const stream = fetchStream(this.hashToUrl(hash))
      const hasher = crypto.createHash("sha256")
      const wrappedStream = (async function*(){
        for await (const part of stream) {
          hasher.update(part)
          yield part
        }
      })()
      const result = $wrappedValue.deserializeAsync(wrappedStream)

      return result.catch(async () => {
        for await (const {} of wrappedStream); // Finish hashing the stream
        if(hasher.digest("hex") === hash) return null
        await new Promise(r => setTimeout(r, lookupRawRetryTimer))
        return this.lookupRaw(hash) // Try again
      })
    })
  }

  lookupRefHash(loc: readonly unknown[]): Promise<Hash<unknown>>{
    return this.wrapRendering(async () =>
      this.clientServerMessenger.lookupRef(await Promise.all(loc.map(x =>
        this.artifactManager.storeRaw(x),
      ))),
    )
  }

  async lookupRef(loc: readonly unknown[]){
    return this.wrapRendering(async () => {
      const hash = await this.lookupRefHash(loc)
      return this.lookupRaw(hash)
    })
  }

  async wrapRendering<T>(fn: () => Promise<T>){
    this.renderJobsPending(this.renderJobsPending.value + 1)
    const result = await fn()
    this.renderJobsPending(this.renderJobsPending.value - 1)
    return result
  }

  triggerParamsUpdate = () => {
    this.sendParams = true
    this.clientServerMessenger.emit("changeObserved")
  }

}

export class WebSocketClientState extends ClientState {

  emit: (value: Uint8Array) => void
  curWs?: WebSocket
  disconnectTimeout: any
  url: string

  constructor(url: string, artifactManager: ArtifactManager, hashToUrl: ClientState["hashToUrl"]){
    const [a, b] = createConnectionPair<Uint8Array, unknown>()
    b.onMsg(message => this.curWs?.send(message))
    const connection = serializeConnection(a)
    super(connection, artifactManager, hashToUrl)
    this.emit = b.send
    this.url = url
    this.initWs()
  }

  async initWs(){
    if(this.curWs) return
    if(this.disconnectTimeout) clearTimeout(this.disconnectTimeout)

    this.serverStatus("connecting")
    await new Promise(r => setTimeout(r, 1000))
    const ws = this.curWs = new WebSocket(this.url)
    ws.addEventListener("open", () => {
      if(this.curWs !== ws)
        return ws.close()
      this.serverStatus("connected")
      this.connect()
    })
    ws.binaryType = "arraybuffer"

    ws.addEventListener("close", () => this.disconnect(ws))
    ws.addEventListener("error", () => this.disconnect(ws))
    ws.addEventListener("message", async ({ data }) => {
      this.emit(new Uint8Array(data))
    })
  }

  disconnect(ws: WebSocket){
    ws.close()
    if(ws !== this.curWs)
      return
    this.serverStatus("disconnected")
    this.curWs = undefined
    setTimeout(() => this.initWs(), 5000)
  }

}

async function* fetchStream(input: RequestInfo, init?: RequestInit){
  const response = await fetch(input, init)
  if(!response.ok) throw new Error(`${response.status}`)
  if(!response.body) throw new Error("Missing body")
  const reader = response.body.getReader()
  while(true) {
    const result = await reader.read()
    if(result.value) yield result.value
    if(result.done) return
  }
}
