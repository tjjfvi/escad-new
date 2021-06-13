
import { Hash, artifactManager, ConversionRegistry, ExportTypeRegistry, Product } from "@escad/core"

export async function lookupRef(locHashes: readonly Hash<unknown>[]){
  console.log(locHashes)
  const loc = await Promise.all(locHashes.map(hash => artifactManager.lookupRaw(hash)))
  console.log(loc)
  const type = getRefType(loc)
  const timerName = type ? `${type} ${Hash.create(loc).slice(0, 16)}...` : undefined
  if(type) console.time(timerName)
  const artifact = await artifactManager.lookupRef(loc)
  const artifactHash = await artifactManager.storeRaw(artifact)
  if(type) console.timeEnd(timerName)
  return artifactHash
}

function getRefType(loc: readonly unknown[]): string | undefined{
  if(loc[0] === ConversionRegistry.artifactStoreId)
    return Product.isProduct(loc[2]) ? "Convert" : "Compose"
  if(loc[0] === ExportTypeRegistry.artifactStoreId)
    return "Export"
}
