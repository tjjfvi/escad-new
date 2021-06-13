
import {
  Element,
  Id,
  Operation,
  Product,
  TupleProduct,
  ConvertibleTo,
  Conversion,
  conversionRegistry,
  ArrayProductType,
  ArrayProduct,
  MarkedProduct,
  Elementish,
  HashProduct,
} from "@escad/core"
import { BoundingBox } from "./BoundingBox"
import { Mesh } from "./Mesh"
import { Vector3 } from "./Vector3"

const getBoundingBoxId = Id.create(__filename, "@escad/builtins", "Marker", "GetBoundingBox")
export type GetBoundingBox<T extends Product> = MarkedProduct<typeof getBoundingBoxId, T>
export const GetBoundingBox = MarkedProduct.for(getBoundingBoxId)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/getBoundingBox": (
        | Conversion<GetBoundingBox<ArrayProduct<Mesh>>, BoundingBox>
      ),
    }
  }
}

conversionRegistry.register({
  id: Id.create(__filename, "@escad/builtins", "Conversion", "GetBoundingBoxMesh"),
  fromType: GetBoundingBox.createProductType(ArrayProductType.create(Mesh)),
  toType: BoundingBox,
  convert: async ({ child: { children: meshes } }) => {
    let min, max
    for(const mesh of meshes)
      for(const face of mesh.faces)
        for(const vertex of face.points) {
          min = Vector3.min(min ?? vertex, vertex)
          max = Vector3.max(max ?? vertex, vertex)
        }
    if(!min || !max)
      throw new Error("Cannot convert empty meshes to BoundingBox")
    return BoundingBox.create(min, max)
  },
  weight: 1,
})

export const _boundingBox = async (args: Element<ConvertibleTo<Mesh>>) =>
  GetBoundingBox.create(TupleProduct.create(
    await Element.toArrayFlat(Element.map(args, x => HashProduct.fromProduct(x))),
  ))

export const boundingBox = Operation.create("boundingBox", _boundingBox, { showOutput: false })

export const getBoundingBox = async (...args: Elementish<ConvertibleTo<Mesh>>[]) =>
  await conversionRegistry.convertProduct(BoundingBox.productType, await _boundingBox(Element.create(args)))
