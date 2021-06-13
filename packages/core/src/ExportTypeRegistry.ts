
import { ExportType } from "./ExportType"
import { artifactManager, ArtifactManager } from "./ArtifactManager"
import { Id } from "./Id"
import { ArtifactStore } from "./ArtifactStore"
import { Product, ProductType } from "./Product"
import { conversionRegistry, ConversionRegistry } from "./ConversionRegistry"
import { WrappedValue } from "./WrappedValue"

export class ExportTypeRegistry {

  constructor(public artifactManager: ArtifactManager, public conversionRegistry: ConversionRegistry){
    this.artifactManager.artifactStores.push(this.artifactStore)
  }

  private registered = new Map<Id, ExportType<any>>()

  static readonly artifactStoreId = Id.create(__filename, "@escad/core", "ArtifactStore", "ExportTypeRegistry")
  readonly artifactStore: ArtifactStore = {
    lookupRef: async ([id, exportTypeId, products], artifactManager) => {
      if(id !== ExportTypeRegistry.artifactStoreId) return null
      const exportType = this.registered.get(exportTypeId as Id)
      if(!exportType) return null
      if(!(products instanceof Array) || !products.every(Product.isProduct)) return null
      const convertedProducts = await Promise.all(products.map(p =>
        this.conversionRegistry.convertProduct(ProductType.fromProductTypeish(exportType.productType), p),
      ))
      const exported = await exportType.export(convertedProducts)
      await artifactManager.storeRef([id, exportTypeId, products], exported)
      return WrappedValue.create(exported)
    },
  }

  register<T extends Product>(exportType: ExportType<T>){
    this.registered.set(exportType.id, exportType)
  }

  listRegistered(): Iterable<ExportType<any>>{
    return this.registered.values()
  }

}

export const exportTypeRegistry = new ExportTypeRegistry(artifactManager, conversionRegistry)
