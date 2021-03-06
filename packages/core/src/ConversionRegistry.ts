/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { ProductType, Product } from "./Product"
import { ConvertibleTo, ConversionImpl, ConversionImplish } from "./Conversions"
import { Hash } from "./Hash"
import { artifactManager, ArtifactManager } from "./ArtifactManager"
import { ArtifactStore } from "./ArtifactStore"
import { Id } from "./Id"
import { TupleProduct, TupleProductType } from "./TupleProduct"
import { ArrayProduct, ArrayProductType } from "./ArrayProduct"
import { UnknownProduct, UnknownProductType } from "./UnknownProduct"
import { MarkedProduct, MarkedProductType } from "./MarkedProduct"
import { HashProduct, HashProductType } from "./HashProduct"
import { IdMap } from "./IdMap"

type ConversionPath = ConversionImpl<any, any>[]

export class ConversionRegistry {

  constructor(public artifactManager: ArtifactManager){
    this.artifactManager.artifactStores.push(this.artifactStore)
  }

  static readonly artifactStoreId = Id.create(__filename, "@escad/core", "ArtifactStore", "ConversionRegistry", "0")
  readonly artifactStore: ArtifactStore = {
    lookupRef: async ([id, toType, from]) => {
      if(!Id.isId(id) || !Id.equal(id, ConversionRegistry.artifactStoreId)) return null
      if(!ProductType.isProductType(toType)) return null
      if(Product.isProduct(from))
        return this.convertProduct(toType, from)
      if(ProductType.isProductType(from))
        return this.compose(from, toType)
    },
  }

  readonly excludeStores: ReadonlySet<ArtifactStore> = new Set([this.artifactStore])

  private readonly registered = new IdMap<ConversionImpl<any, any>>()

  register<F extends Product, T extends Product>(conversion: ConversionImplish<F, T> & { id: object }): void{
    this.registered.set(conversion.id, {
      ...conversion,
      fromType: ProductType.fromProductTypeish(conversion.fromType),
      toType: ProductType.fromProductTypeish(conversion.toType),
    })
  }

  async has(a: ProductType, b: ProductType){
    return !!(await this.compose(a, b))
  }

  private async compose(fromType: ProductType, toType: ProductType): Promise<ConversionPath | null>{
    const stored = await this.artifactManager.lookupRef(
      [ConversionRegistry.artifactStoreId, toType, fromType],
      this.excludeStores,
    )

    if(stored)
      return this.rehydrateConversionPath(stored as ConversionPath)

    let bestPath: ConversionPath | null = null
    const promises = []

    const tasks = [{
      type: fromType,
      prior: [] as ConversionPath,
    }]

    while(tasks.length) {
      const { type, prior } = tasks.pop()!
      if(prior.some(c => Hash.equal(c.fromType, type)))
        continue

      if(this.maybeImplicitlyConvertibleTo(type, toType))
        promises.push(
          this.finishPath(fromType, prior, toType).then(path => {
            if(!bestPath || path && this.weight(path) <= this.weight(bestPath))
              bestPath = path
          }),
        )

      else
        for(const conversion of this.registered.values())
          if(this.maybeImplicitlyConvertibleTo(type, conversion.fromType))
            tasks.push({
              type: conversion.toType,
              prior: [...prior, conversion],
            })
    }

    await this.artifactManager.storeRef(
      [ConversionRegistry.artifactStoreId, toType, fromType],
      Promise.all(promises).then(() => bestPath),
      this.excludeStores,
    )

    return bestPath
  }

  private async finishPath(initialFromType: ProductType, path: ConversionPath | null, finalToType: ProductType){
    if(!path)
      return null

    for(let i = 0; i <= path.length; i++) {
      const fromType = path[i - 1]?.toType ?? initialFromType
      const toType = path[i]?.fromType ?? finalToType

      if(Hash.equal(fromType, toType))
        continue

      const part = await this.finishPathSegment(fromType, toType)
      if(!part) return null

      const id = Hash.create([part.fromType, part.toType])

      path.splice(i, 0, { ...part, id })
      i--
    }

    return path
  }

  private maybeImplicitlyConvertibleTo(fromType: ProductType, toType: ProductType): boolean{
    return false
      || Hash.equal(fromType, toType)
      || HashProductType.isHashProductType(fromType)
      || HashProductType.isHashProductType(toType)
      || UnknownProductType.isUnknownProductType(toType)
      || true
        && MarkedProductType.isMarkedProductType(fromType)
        && MarkedProductType.isMarkedProductType(toType)
        && Id.equal(fromType.marker, toType.marker)
      || true
        && TupleProductType.isTupleProductType(fromType)
        && ArrayProductType.isArrayProductType(toType)
      || true
        && ArrayProductType.isArrayProductType(fromType)
        && ArrayProductType.isArrayProductType(toType)
      || true
        && TupleProductType.isTupleProductType(fromType)
        && TupleProductType.isTupleProductType(toType)
        && fromType.elementTypes.length === toType.elementTypes.length
  }

  private async finishPathSegment(
    fromType: ProductType,
    toType: ProductType,
  ): Promise<Omit<ConversionImpl<any, any>, "id"> | null>{
    if(HashProductType.isHashProductType(fromType)) {
      const resolvedFromType = await this.artifactManager.lookupRaw(fromType.productType)
      if(!resolvedFromType) throw new Error("Could not resolve HashProductType")
      const subPath = await this.compose(resolvedFromType, toType)
      return subPath && {
        fromType,
        toType,
        convert: async ({ hash }: HashProduct) => {
          const product = await this.artifactManager.lookupRaw(hash)
          if(!product)
            throw new Error("Could not resolve HashProduct " + hash)
          return await this.executeConversionPath(product, subPath)
        },
        weight: this.weight(subPath),
      }
    }

    if(HashProductType.isHashProductType(toType)) {
      const resolvedToType = await this.artifactManager.lookupRaw(toType.productType)
      if(!resolvedToType) throw new Error("Could not resolve HashProductType")
      const subPath = await this.compose(fromType, resolvedToType)
      return subPath && {
        fromType: resolvedToType,
        toType,
        convert: async (product: Product) =>
          await HashProduct.fromProduct(
            await this.executeConversionPath(product, subPath),
            this.artifactManager,
          ),
        weight: this.weight(subPath),
      }
    }

    if(UnknownProductType.isUnknownProductType(toType))
      return {
        fromType,
        toType,
        convert: async (product: Product) =>
          UnknownProduct.create(product),
        weight: 0,
      }

    if(
      MarkedProductType.isMarkedProductType(fromType)
      && MarkedProductType.isMarkedProductType(toType)
      && Id.equal(fromType.marker, toType.marker)
    ) {
      const subPath = await this.compose(fromType.child, toType.child)
      return subPath && {
        fromType,
        toType,
        convert: async (product: MarkedProduct) =>
          MarkedProduct.create(product.marker, await this.executeConversionPath(product.child, subPath)),
        weight: this.weight(subPath),
      }
    }

    if(
      TupleProductType.isTupleProductType(fromType)
      && ArrayProductType.isArrayProductType(toType)
    )
      return {
        fromType: TupleProductType.create(Array(fromType.elementTypes.length).fill(toType.elementType)),
        toType,
        convert: async (product: TupleProduct) =>
          ArrayProduct.create(product.children),
        weight: 0,
      }

    if(
      ArrayProductType.isArrayProductType(fromType)
      && ArrayProductType.isArrayProductType(toType)
    ) {
      const subPath = await this.compose(fromType.elementType, toType.elementType)
      return subPath && {
        fromType,
        toType,
        convert: async (product: ArrayProduct) =>
          ArrayProduct.create(await Promise.all(product.children.map(child =>
            this.executeConversionPath(child, subPath),
          ))),
        weight: this.weight(subPath),
      }
    }

    if(
      TupleProductType.isTupleProductType(fromType)
      && TupleProductType.isTupleProductType(toType)
      && fromType.elementTypes.length === toType.elementTypes.length
    ) {
      const subPaths = await Promise.all(fromType.elementTypes.map((subFromType, i) =>
        this.compose(subFromType, toType.elementTypes[i]),
      ))
      if(subPaths.some(subPath => subPath === null))
        return null
      return {
        fromType,
        toType,
        convert: async (product: TupleProduct<any[]>) =>
          TupleProduct.create(await Promise.all(product.children.map((child, i) =>
            this.executeConversionPath(child, subPaths[i]!),
          ))),
        weight: subPaths.map(subPath => this.weight(subPath!)).reduce((a, b) => a + b),
      }
    }

    return null
  }

  private weight(path: ConversionPath){
    return path.reduce((a, b) => a + b.weight, 0)
  }

  private async executeConversionPath(product: Product, conversions: ConversionPath){
    if(!conversions.length) return product

    const toType = conversions[conversions.length - 1].toType
    const ref = [ConversionRegistry.artifactStoreId, toType, product]

    const stored = await this.artifactManager.lookupRef(ref, this.excludeStores)

    if(stored)
      return stored as Product

    const result = this._executeConversionPath(product, conversions)

    await this.artifactManager.storeRef(ref, result, this.excludeStores)

    return await result
  }

  private async _executeConversionPath(product: Product, conversions: ConversionPath){
    for(const conversion of conversions) {
      const { toType } = conversion
      const ref = [ConversionRegistry.artifactStoreId, toType, product]
      const stored = await this.artifactManager.lookupRef(ref, this.excludeStores)
      if(stored) {
        product = stored as Product
        continue
      }
      const result = conversion.convert(product)
      await this.artifactManager.storeRef(ref, result, this.excludeStores)
      product = await result
      continue
    }

    return product
  }

  async convertProduct<T extends Product, F extends ConvertibleTo<T>>(
    toType: ProductType<T>,
    from: F,
  ): Promise<T>{
    const fromType = Product.getProductType(from)

    const conversions = await this.compose(fromType, toType)

    if(!conversions)
      throw new Error(`Could not find path to convert product type ${Hash.create(fromType)} to ${Hash.create(toType)}`)

    return await this.executeConversionPath(from, conversions) as T
  }

  private rehydrateConversionPath(path: Array<Omit<ConversionImpl<any, any>, "convert">>): ConversionPath{
    return path.map(part => this.rehydrateConversion(part))
  }

  private rehydrateConversionMemo = new WeakMap<Omit<ConversionImpl<any, any>, "convert">, ConversionImpl<any, any>>()
  private rehydrateConversion(conversion: Omit<ConversionImpl<any, any>, "convert">): ConversionImpl<any, any>{
    const existing = this.rehydrateConversionMemo.get(conversion)
    if(existing) return existing
    const rehydrated: ConversionImpl<any, any> = {
      ...conversion,
      // This function will get replaced when called
      convert: async (product: Product): Promise<Product> => {
        const { fromType, toType, id } = rehydrated
        if(Id.isId(id)) {
          const registered = this.registered.get(id)
          if(!registered) throw new Error(`Could not find conversion with id ${id.full}`)
          Object.assign(rehydrated, registered)
        }
        else {
          const computed = await this.finishPathSegment(rehydrated.fromType, rehydrated.toType)
          if(!computed || !Hash.equal(fromType, computed.fromType) || !Hash.equal(toType, computed.toType))
            throw new Error(`Could not create conversion from ${Hash.create(fromType)} to ${Hash.create(toType)}`)
          Object.assign(rehydrated, computed)
        }
        if(rehydrated.convert === origConvert)
          throw new Error("Could not rehydrate conversion part")
        return rehydrated.convert(product)
      },
    }
    const origConvert = rehydrated.convert
    this.rehydrateConversionMemo.set(conversion, rehydrated)
    return rehydrated
  }

}

export const conversionRegistry = new ConversionRegistry(artifactManager)
