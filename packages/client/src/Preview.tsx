
import "../stylus/Preview.styl"
import React, { useContext, useEffect } from "react"
import { viewerRegistry } from "./ViewerRegistry"
import { observer, useObservable } from "rhobo"
import { Product } from "@escad/core"
import { Export } from "./Export"
import { Viewer } from "./Viewer"
import { ClientState } from "./ClientState"
import { Loading } from "./Loading"
import { usePromise } from "./usePromise"
import { Stats } from "./Stats"

export const Preview = observer(() => {
  const state = useContext(ClientState.Context)
  const products = state.products.use()()
  const viewerObs = useObservable.use<Viewer<any>>()
  const viewers = usePromise(async () => {
    const productTypes = products.map(Product.getProductType)
    state.viewerStatus("converting")
    const unsortedViewers = await viewerRegistry.getContextsForAll(productTypes)
    return unsortedViewers?.sort((a, b) => b.weight - a.weight)
  }, [products])

  useEffect(() => {
  }, [products])

  if(!products.length)   {
    state.viewerStatus("displayed")
    return <div className="Preview none">
      <span className="header">No products to display.</span>
      <Stats/>
    </div>
  }

  if(!viewers)
    return <div className="Preview loading">
      <div className="menubar">
        <Export/>
      </div>
      <Loading/>
      <Stats/>
    </div>

  const selectedViewer = viewerObs()
  const viewer =
    selectedViewer && viewers.includes(selectedViewer)
      ? selectedViewer
      : viewers[0] ?? null

  if(!viewer)
    return <div className="Preview none">
      <div className="menubar">
        <Export/>
      </div>
      <span className="header">No viewers found for these products.</span>
      <Stats/>
    </div>

  state.viewerStatus("converting")
  const inputs = products.map(product => viewerRegistry.mapProduct(viewer, product))
  Promise.all(inputs).then(() => state.viewerStatus("displayed"))
  return <div className={"Preview " + (viewer.className ?? "")}>
    <viewer.component inputs={inputs}/>
    <div className="menubar">
      <div>
        {viewers.map((v, i) =>
          <span key={i} onClick={() => viewerObs(v)}>{v.name}</span>,
        )}
        <span>Viewer</span>
      </div>
      <Export/>
    </div>
    <Stats/>
  </div>
})
