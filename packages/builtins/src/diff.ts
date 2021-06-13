
import {
  TupleProduct,
  Conversion,
  Id,
  Product,
  Element,
  Component,
  conversionRegistry,
  ConvertibleOperation,
  ConvertibleElementish,
  Operation,
  MarkedProduct,
  TupleProductType,
} from "@escad/core"
import { Bsp, ClipOptions } from "./Bsp"
import { Union } from "./union"

const diffId = Id.create(__filename, "@escad/builtins", "Marker", "Diff")
export type Diff<T extends Product> = MarkedProduct<typeof diffId, T>
export const Diff = MarkedProduct.for(diffId)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/diff": {
        computeDiff: Conversion<Diff<TupleProduct<readonly [Bsp, Bsp]>>, Bsp>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Diff.createProductType(TupleProductType.create([Bsp, Bsp])),
  toType: Bsp,
  convert: async ({ child: { children: [a, b] } }) => {
    b = Bsp.invert(b)
    a = Bsp.clipTo(a, b, ClipOptions.DropFront | ClipOptions.DropCoplanar)
    b = Bsp.clipTo(b, a, ClipOptions.DropFront | ClipOptions.DropCoplanarBack)
    return Bsp.build(a, Bsp.allFaces(b)) ?? Bsp.null()
  },
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "Diff"),
})

export const diff: ConvertibleOperation<Bsp, Bsp> =
  Operation.create("diff", async el => {
    let originalArgs: ConvertibleElementish<Bsp> = await Element.toArrayDeep(el)
    if(!(originalArgs instanceof Array))
      return originalArgs
    if(originalArgs.length === 0)
      return []
    if(originalArgs.length === 1)
      [originalArgs] = originalArgs
    const args = await Element.toArrayDeep(Element.create(originalArgs))
    if(Product.isProduct(args))
      return args
    const positive = Union.create(TupleProduct.create(await Element.toArrayFlat(args[0])))
    const negative = Union.create(TupleProduct.create(await Element.toArrayFlat(args.slice(1))))
    return Diff.create(TupleProduct.create([positive, negative]))
  }, { showOutput: false })

export const sub: Component<ConvertibleElementish<Bsp>[], ConvertibleOperation<Bsp, Bsp>> =
  Component.create("sub", (...el) =>
    Operation.create("sub", el2 => diff(el2, el), { overrideHierarchy: false })
  , { showOutput: false })
