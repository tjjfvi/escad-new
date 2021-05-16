
import "../stylus/Stats.styl"
import React, { useContext, useState } from "react"
import { ClientState } from "./ClientState"
import { conversionRegistry, Product, ProductType, ProductTypeish, Promisish, ScopedId } from "@escad/core"
import { observer } from "rhobo"
import { usePromise } from "./usePromise"

const registeredStats: Stat[] = []

export function registerStat(stat: Stat){
  for(const [i, existingStat] of registeredStats.entries())
    if(existingStat.weight < stat.weight) {
      registeredStats.splice(i, 0, stat)
      return
    }
  registeredStats.push(stat)
}

export type ProductStat<T extends Product = Product> = Omit<Stat, "value"> & {
  productType: ProductTypeish<T>,
  value: (products: T[], state: ClientState) => Promisish<ReturnType<Stat["value"]>>,
}
export function registerProductStat<T extends Product>(stat: ProductStat<T>): void
export function registerProductStat(stat: Omit<ProductStat<Product>, "productType">): void
export function registerProductStat(stat:
  Omit<ProductStat, "productType"> & Partial<Pick<ProductStat, "productType">>,
): void{
  const { productType: productTypeish } = stat
  const productType = productTypeish && ProductType.fromProductTypeish(productTypeish)
  registerStat({
    ...stat,
    value: state => {
      const products = state.products()
      if(!productType)
        return usePromise(async () => stat.value(products, state), [products])
      const convertedProducts = usePromise(async () => {
        const productsAndPaths = await Promise.all(products.map(async product =>
          [product, await conversionRegistry.compose(Product.getProductType(product), productType)] as const,
        ))
        if(productsAndPaths.some(([, path]) => !path)) return null
        return await Promise.all(productsAndPaths.map(([product, path]) =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          conversionRegistry.executeConversionPath(product, path!),
        ))
      }, [products])
      return usePromise(async () =>
        convertedProducts && await stat.value(convertedProducts, state)
      , [convertedProducts])
    },
  })
}

export interface Stat {
  readonly id: ScopedId<"Stat">,
  readonly label: string,
  readonly value: (state: ClientState) => string | null | undefined,
  readonly weight: number,
}

export const Stats = () => {
  const [open, setOpen] = useState(false)
  return <div className={"Stats" + (open ? " open" : "")}>
    <span onClick={() => setOpen(!open)}>Stats</span>
    <div className="content">
      {registeredStats.map(stat => <StatView key={stat.id.full} stat={stat}/>)}
    </div>
  </div>
}

const StatView = observer(({ stat }: { stat: Stat }) => {
  const state = useContext(ClientState.Context)
  const value = stat.value(state)
  if(!value) return null
  return <div className="stat">
    <span>{stat.label}:</span>
    <span>{value}</span>
  </div>
})
