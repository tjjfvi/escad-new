
import { LeafProduct, LeafProductType } from "./LeafProduct"
import { TupleProduct, TupleProductType } from "./TupleProduct"
import { ArrayProduct, ArrayProductType } from "./ArrayProduct"
import {
  __convertibleTo,
  __convertibleToOverride,
  _ConvertibleTo,
  __convertibleToTransitivityOverride,
  TransitivityOverride,
} from "./Conversions"
import { Hash } from "./Hash"
import { UnknownProduct, UnknownProductType } from "./UnknownProduct"
import { ScopedId } from "./Id"
import { MarkedProduct, MarkedProductType } from "./MarkedProduct"
import { HashProduct, HashProductType } from "./HashProduct"
import { Timer } from "./Timer"

export interface _Product {
  readonly type: string | ScopedId<"LeafProduct">,
  readonly [__convertibleToTransitivityOverride]?: TransitivityOverride.A,
  /** @ts-ignore **/
  readonly [__convertibleTo]?: (
    | __convertibleToOverride extends keyof this ? unknown
    : LeafProduct extends this ? unknown
    : MarkedProduct extends this ? unknown
    : TupleProduct extends this ? unknown
    : ArrayProduct extends this ? unknown
    : HashProduct extends this ? unknown
    : UnknownProduct extends this ? unknown
    : _ConvertibleTo<this>
  ),
}

export type Product =
  | LeafProduct
  | MarkedProduct
  | TupleProduct
  | ArrayProduct
  | HashProduct
  | UnknownProduct

export const Product = {
  isProduct,
  getProductType: Timer.create().timeFn(<P extends Product>(product: P): ProductType<P> => {
    if(LeafProduct.isLeafProduct(product))
      return LeafProduct.getLeafProductType(product)
    if(MarkedProduct.isMarkedProduct(product))
      return MarkedProduct.getMarkedProductType(product)
    if(TupleProduct.isTupleProduct(product))
      return TupleProduct.getTupleProductType(product)
    if(ArrayProduct.isArrayProduct(product))
      return ArrayProduct.getArrayProductType(product)
    if(HashProduct.isHashProduct(product))
      return HashProduct.getHashProductType(product)
    if(UnknownProduct.isUnknownProduct(product))
      return UnknownProductType.create() as ProductType<P>
    throw new Error("Invalid product passed to Product.getProductType")
  }),
}

function isProduct(arg: any): arg is Product
function isProduct<P extends Product>(arg: any, productType: ProductType<P>): arg is P
function isProduct(arg: any, productType?: ProductType){
  return (
    (
      LeafProduct.isLeafProduct(arg)
      || MarkedProduct.isMarkedProduct(arg)
      || TupleProduct.isTupleProduct(arg)
      || ArrayProduct.isArrayProduct(arg)
      || HashProduct.isHashProduct(arg)
      || UnknownProduct.isUnknownProduct(arg)
    )
    && (!productType || Hash.equal(Product.getProductType(arg), productType))
  )
}

export type ProductType<U extends Product = Product> =
  | LeafProductType<U & LeafProduct>
  | MarkedProductType<U & MarkedProduct>
  | TupleProductType<U & TupleProduct>
  | ArrayProductType<U & ArrayProduct>
  | HashProductType<U & HashProduct>
  | (U extends UnknownProduct ? UnknownProductType : never)

export const ProductType = {
  isProductType: (value: unknown): value is ProductType =>
    LeafProductType.isLeafProductType(value)
    || MarkedProductType.isMarkedProductType(value)
    || TupleProductType.isTupleProductType(value)
    || ArrayProductType.isArrayProductType(value)
    || HashProductType.isHashProductType(value)
    || UnknownProductType.isUnknownProductType(value),
  fromProductTypeish: <T extends Product>(productTypeish: ProductTypeish<T>): ProductType<T> =>
    ProductType.isProductType(productTypeish) ? productTypeish : productTypeish?.productType,
}

export type ProductTypeish<T extends Product> = ProductType<T> | { productType: ProductType<T> }
