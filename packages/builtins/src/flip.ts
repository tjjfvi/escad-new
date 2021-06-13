
import {
  Id,
  Product,
  Conversion,
  mapOperation,
  conversionRegistry,
  MarkedProduct,
  ConvertibleTo,
  Operation,
} from "@escad/core"
import { Face } from "./Face"
import { Mesh } from "./Mesh"

const flipFacesId = Id.create(__filename, "@escad/builtins", "Marker", "FlipFaces")
export type FlipFaces<T extends Product> = MarkedProduct<typeof flipFacesId, T>
export const FlipFaces = MarkedProduct.for(flipFacesId)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/flip": {
        flipMesh: Conversion<FlipFaces<Mesh>, Mesh>,
      },
    }
  }
}

conversionRegistry.register<FlipFaces<Mesh>, Mesh>({
  convert: async ({ child: mesh }) =>
    Mesh.create(mesh.faces.map(face =>
      Face.create(face.points.slice().reverse()),
    )),
  fromType: FlipFaces.createProductType(Mesh),
  toType: Mesh,
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "FlipFaces"),
})

export const flip: Operation<ConvertibleTo<Mesh>, FlipFaces<ConvertibleTo<Mesh>>> =
  mapOperation("flip", FlipFaces.create, { showOutput: false })
