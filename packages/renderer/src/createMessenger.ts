
import {
  artifactManager,
  exportTypeRegistry,
  Product,
  Element,
  Hierarchy,
  contextStack,
  ObjectParam,
  ProductType,
  Logger,
  $wrappedValue,
} from "@escad/core"
import { RenderInfo, RendererServerMessenger, LoadFileInfo } from "@escad/protocol"
import { Connection, createMessenger } from "@escad/messages"
import { registeredPlugins } from "@escad/register-client-plugin"
import { lookupRef } from "./lookupRef"
import { RenderFunction } from "./renderFunction"
import { HashProduct } from "@escad/core"

export const createRendererServerMessenger = (
  connection: Connection<unknown>,
  requireFile: () => unknown,
  logger: Logger,
) => {
  const messenger: RendererServerMessenger = createMessenger({
    impl: {
      run,
      loadFile,
      lookupRef,
    },
    connection,
  })

  artifactManager.artifactStores.push({
    lookupRaw: async hash => {
      const result = await messenger.lookupRaw(hash)
      if(!result) return null
      return $wrappedValue.deserialize(result)
    },
  })

  let lastEmitLogPromise : Promise<unknown> = Promise.resolve()
  logger.onLog(async log => {
    console.log(log)
    if(!log)
      lastEmitLogPromise = lastEmitLogPromise.then(() => {
        messenger.emit("log", null)
      })

    else {
      // Preserves log ordering and avoids race conditions where
      // the client requests the log before the file is written
      const [hash] = await (lastEmitLogPromise = Promise.all([
        artifactManager.storeRaw(log),
        lastEmitLogPromise,
      ]))
      messenger.emit("log", hash)
    }
  })

  return messenger

  async function run(params?: unknown){
    messenger.emit("renderStart")
    logger.clear()

    const loadInfo: LoadFileInfo = await loadFile()

    const { func, paramDef } = loadInfo
    const { defaultValue: defaultParams } = paramDef
    const paramDefHash = paramDef ? artifactManager.storeRaw(paramDef) : null

    const renderParams = params ?? defaultParams
    console.log(`Rendering with ${renderParams === defaultParams ? "default" : "custom"} params:`)
    console.log(renderParams)
    const { products, hierarchy } = await render(renderParams)
    console.log("Rendered")

    const renderInfo: RenderInfo = {
      ...loadInfo,
      paramDef: await paramDefHash,
      products,
      hierarchy,
    }
    messenger.emit("renderFinish")

    return renderInfo

    async function render(params: unknown){
      let result
      try {
        result = await contextStack.wrap(() => func(params as never))
      }
      catch (e) {
        console.error(e)
        return { products: [], hierarchy: null }
      }
      if(!result) {
        console.error(new Error("Invalid return type from exported function"))
        return { products: [], hierarchy: null }
      }
      const el = Element.create<Product>(result)
      const [products, hierarchy] = await Promise.all([
        Element.toArrayFlat(el).then(products =>
          Promise.all(products.map(async product =>
            artifactManager.storeRaw(HashProduct.fromProduct(product)),
          )),
        ),
        Hierarchy.from(el).then(hierarchy =>
          artifactManager.storeRaw(hierarchy),
        ),
      ])
      return { products, hierarchy }
    }
  }

  async function loadFile(){
    const fullExported = requireFile()

    if(typeof fullExported !== "object" || !fullExported || !("default" in fullExported))
      throw new Error("File has no default export")

    const exported = fullExported["default" as never] as unknown

    if(typeof exported !== "function" && !(exported instanceof RenderFunction))
      throw new Error("Expected export type of function or RenderFunction")

    const [func, _paramDef] =
        exported instanceof RenderFunction
          ? [exported.func, exported.paramDef]
          : [exported, null]
    const paramDef = ObjectParam.create(_paramDef ?? {})

    const exportTypes = [...exportTypeRegistry.listRegistered()].map(x => ({
      ...x,
      export: undefined,
      productType: ProductType.fromProductTypeish(x.productType),
    }))

    const loadInfo: LoadFileInfo = {
      paramDef,
      clientPlugins: [...registeredPlugins],
      exportTypes,
      func,
    }

    return loadInfo
  }

}
