
import { conversionRegistry, ExportTypeInfo, ExportTypeRegistry, Product } from "@escad/core"
import React, { useContext } from "react"
import { observer } from "rhobo"
import { ClientState } from "./ClientState"
import { ProductConsumerRegistry } from "./ProductConsumerRegistry"
import { usePromise } from "./usePromise"

export const Export = observer(() => {
  const state = useContext(ClientState.Context)
  const consumerRegistry = new ProductConsumerRegistry<Product, Product, ExportTypeInfo>(conversionRegistry)
  consumerRegistry.registrations = new Set(state.exportTypes().map(e => ({
    type: e.productType,
    context: e,
    map: x => x,
  })))
  const products = state.products()
  const exportTypes = usePromise(async () => {
    const productTypes = products.map(Product.getProductType)
    return await consumerRegistry.getContextsForAll(productTypes)
  }, [products])
  if(exportTypes?.length)
    return (
      <div>
        {
          exportTypes.map(exportType =>
            <span key={exportType.id} onClick={() => exportProducts(state, exportType)}>{exportType.name}</span>,
          )
        }
        <span>Export</span>
      </div>
    )
  return null
})

async function exportProducts(state: ClientState, exportType: ExportTypeInfo){
  const url = state.hashToUrl(await state.lookupRefHash([
    ExportTypeRegistry.artifactStoreId,
    exportType.id,
    state.products.value,
  ]))
  console.log(url)
  download(url, "export" + exportType.extension)
}

function download(url: string, filename: string){
  const a = document.createElement("a")
  a.href = url
  a.setAttribute("download", filename)
  a.click()
}
