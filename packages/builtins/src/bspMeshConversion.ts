
import { Conversion, conversionRegistry, Id } from "@escad/core"
import { Mesh } from "./Mesh"
import { Bsp } from "./Bsp"

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/bspMeshConversion": {
        meshToBsp: Conversion<Mesh, Bsp>,
        bspToMesh: Conversion<Bsp, Mesh>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Mesh,
  toType: Bsp,
  convert: async mesh =>
    Bsp.build(null, mesh.faces) ?? Bsp.null(),
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "MeshBsp"),
})

conversionRegistry.register({
  fromType: Bsp,
  toType: Mesh,
  convert: async bsp =>
    Mesh.create(Bsp.allFaces(bsp)),
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "BspMesh"),
})
