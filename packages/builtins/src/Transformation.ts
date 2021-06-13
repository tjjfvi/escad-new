import { TupleProduct, Conversion, Product, conversionRegistry, TupleProductType, Id, MarkedProduct } from "@escad/core"
import { Mesh } from "./Mesh"
import { Matrix4 } from "./Matrix4"
import { Face } from "./Face"

const transformId = Id.create(__filename, "@escad/builtins", "Marker", "Transform")
export type Transform<T extends Product> = MarkedProduct<typeof transformId, T>
export const Transform = MarkedProduct.for(transformId)

export type Transformation<T extends Product> = Transform<TupleProduct<readonly [Matrix4, T]>>

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/Transformation": {
        transformMesh: Conversion<Transform<TupleProduct<readonly [Matrix4, Mesh]>>, Mesh>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Transform.createProductType(TupleProductType.create([Matrix4, Mesh])),
  toType: Mesh,
  convert: async ({ child: { children: [matrix, mesh] } }) =>
    Mesh.create(mesh.faces.map(face =>
      Face.create(face.points.map(vector =>
        Matrix4.multiplyVector(matrix, vector),
      )),
    )),
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "Transformation"),
})
