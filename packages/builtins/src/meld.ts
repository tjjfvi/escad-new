
import {
  TupleProduct,
  Conversion,
  Id,
  Element,
  conversionRegistry,
  ArrayProduct,
  ArrayProductType,
  ConvertibleOperation,
  Operation,
  MarkedProduct,
  Product,
} from "@escad/core"
import { Mesh } from "./Mesh"

const meldId = Id.create(__filename, "@escad/builtins", "Marker", "Meld")
export type Meld<T extends Product> = MarkedProduct<typeof meldId, T>
export const Meld = MarkedProduct.for(meldId)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/meld": {
        computeMeld: Conversion<Meld<ArrayProduct<Mesh>>, Mesh>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Meld.createProductType(ArrayProductType.create(Mesh)),
  toType: Mesh,
  convert: async ({ child: { children } }) =>
    Mesh.create(children.flatMap(x => x.faces)),
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "Meld"),
})

export const meld: ConvertibleOperation<Mesh, Mesh> = (
  Operation.create("meld", async el =>
    Meld.create(TupleProduct.create(await Element.toArrayFlat(el)))
  , { showOutput: false })
)
