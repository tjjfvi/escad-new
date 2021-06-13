
import {
  TupleProduct,
  Conversion,
  Id,
  Product,
  Component,
  Element,
  conversionRegistry,
  ArrayProduct,
  ArrayProductType,
  ConvertibleOperation,
  ConvertibleElementish,
  Operation,
  MarkedProduct,
} from "@escad/core"
import { Bsp, ClipOptions } from "./Bsp"

const intersectionId = Id.create(__filename, "@escad/builtins", "Marker", "Intersection")
export type Intersection<T extends Product> = MarkedProduct<typeof intersectionId, T>
export const Intersection = MarkedProduct.for(intersectionId)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/intersection": {
        computeIntersection: Conversion<Intersection<ArrayProduct<Bsp>>, Bsp>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Intersection.createProductType(ArrayProductType.create(Bsp)),
  toType: Bsp,
  convert: async ({ child: { children } }) =>
    children.reduce((a, b) => {
      a = Bsp.clipTo(a, b, ClipOptions.DropFront | ClipOptions.DropCoplanarBack)
      b = Bsp.clipTo(b, a, ClipOptions.DropFront | ClipOptions.DropCoplanar)
      return Bsp.build(a, Bsp.allFaces(b)) ?? Bsp.null()
    }),
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "Intersection"),
})

export const intersection: ConvertibleOperation<Bsp, Bsp> =
  Operation.create("intersection", async el =>
    Intersection.create(TupleProduct.create(await Element.toArrayFlat(el)))
  , { showOutput: false })

export const intersect: Component<ConvertibleElementish<Bsp>[], ConvertibleOperation<Bsp, Bsp>> =
  Component.create("intersect", (...el) =>
    Operation.create("intersect", el2 => intersection(el2, el), { overrideHierarchy: false })
  , { showOutput: false })
