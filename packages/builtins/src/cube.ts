
import {
  Component,
  Id,
  Conversion,
  createLeafProductUtils,
  Element,
  LeafProduct,
  conversionRegistry,
} from "@escad/core"
import { TripletObj, Triplet, interpretTriplet } from "./helpers"
import { Mesh } from "./Mesh"
import { Vector3 } from "./Vector3"

const cubeId = Id.create(__filename, "@escad/builtins", "LeafProduct", "Cube")

export interface Cube extends LeafProduct {
  readonly type: typeof cubeId,
  readonly size: Vector3,
  readonly center: Vector3,
}

export const Cube = {
  create: (size: Vector3, center: Vector3): Cube => ({
    type: cubeId,
    size,
    center,
  }),
  ...createLeafProductUtils<Cube, "Cube">(cubeId, "Cube"),
  id: cubeId,
}

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/cube": {
        cubeToMesh: Conversion<Cube, Mesh>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Cube,
  toType: Mesh,
  convert: async cube => {
    const { center, size } = cube

    const nx = center.x - size.x / 2
    const ny = center.y - size.y / 2
    const nz = center.z - size.z / 2

    const px = center.x + size.x / 2
    const py = center.y + size.y / 2
    const pz = center.z + size.z / 2

    const points = [
      Vector3.create(px, py, pz),
      Vector3.create(nx, py, pz),
      Vector3.create(px, ny, pz),
      Vector3.create(nx, ny, pz),
      Vector3.create(px, py, nz),
      Vector3.create(nx, py, nz),
      Vector3.create(px, ny, nz),
      Vector3.create(nx, ny, nz),
    ]

    return Mesh.fromVertsFaces(points, [
      [0, 1, 2],
      [3, 2, 1],
      [6, 5, 4],
      [5, 6, 7],
      [4, 1, 0],
      [5, 1, 4],
      [6, 2, 3],
      [6, 3, 7],
      [1, 7, 3],
      [5, 7, 1],
      [4, 0, 2],
      [6, 4, 2],
    ])
  },
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "CubeMesh"),
})

export interface CubeArgs extends TripletObj {
  size?: Triplet,
  shift?: Triplet,
}

export const cube: Component<[CubeArgs], Element<Cube>> =
  Component.create("cube", args => {
    const size = interpretTriplet(args.size ?? args, 1)
    const shift = interpretTriplet(args.shift, 0)
    const center = Vector3.multiplyComponents(shift, Vector3.multiplyScalar(size, .5))

    return Element.create(Cube.create(size, center))
  }, { showOutput: false })

