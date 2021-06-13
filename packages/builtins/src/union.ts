
import {
  TupleProduct,
  Conversion,
  Id,
  Product,
  Component,
  conversionRegistry,
  ArrayProductType,
  Element,
  ConvertibleOperation,
  Operation,
  ConvertibleElement,
  MarkedProduct,
  ArrayProduct,
} from "@escad/core"
import { Bsp, ClipOptions } from "./Bsp"

const unionId = Id.create(__filename, "@escad/builtins", "Marker", "Union")
export type Union<T extends Product> = MarkedProduct<typeof unionId, T>
export const Union = MarkedProduct.for(unionId)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/union": {
        computeUnion: Conversion<Union<ArrayProduct<Bsp>>, Bsp>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Union.createProductType(ArrayProductType.create(Bsp)),
  toType: Bsp,
  convert: async ({ child: { children } }) =>
    children.reduce((a, b) => {
      a = Bsp.clipTo(a, b, ClipOptions.DropBack | ClipOptions.DropCoplanarBack)
      b = Bsp.clipTo(b, a, ClipOptions.DropBack | ClipOptions.DropCoplanar)
      return Bsp.build(a, Bsp.allFaces(b)) ?? Bsp.null()
    }),
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "Union"),
})

export const union: ConvertibleOperation<Bsp, Bsp> =
  Operation.create("union", async el =>
    Union.create(TupleProduct.create(await Element.toArrayFlat(el)))
  , { showOutput: false })

export const add: Component<ConvertibleElement<Bsp>[], ConvertibleOperation<Bsp, Bsp>> =
  Component.create("add", (...el) =>
    Operation.create("add", el2 => union(el2, el), { overrideHierarchy: false })
  , { showOutput: false })

