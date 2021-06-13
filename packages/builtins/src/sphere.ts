
import { Mesh } from "./Mesh"
import {
  Element,
  Id,
  Component,
  LeafProduct,
  createLeafProductUtils,
  Conversion,
  conversionRegistry,
} from "@escad/core"
import { interpretTriplet, Triplet } from "./helpers"
import { Smooth, smoothContext } from "./smoothContext"
import { Face } from "./Face"
import { Vector3 } from "./Vector3"

const tau = Math.PI * 2

const sphereId = Id.create(__filename, "@escad/builtins", "LeafProduct", "Sphere")

export interface Sphere extends LeafProduct {
  readonly type: typeof sphereId,
  readonly radius: number,
  readonly smooth: Smooth,
  readonly center: Vector3,
}

export const Sphere = {
  create: (radius: number, smooth: Smooth, center: Vector3): Sphere => ({
    type: sphereId,
    radius,
    smooth,
    center,
  }),
  ...createLeafProductUtils<Sphere, "Sphere">(sphereId, "Sphere"),
  id: sphereId,
}

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/sphere": {
        cylToMesh: Conversion<Sphere, Mesh>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Sphere,
  toType: Mesh,
  convert: async sphere => {
    const { radius, smooth, center } = sphere
    const sides = Math.max(
      2,
      smooth.sides ?? 0,
      Math.ceil(radius * tau / 2 / (smooth.size ?? Infinity)),
      360 / 2 / (smooth.angle ?? Infinity),
    )
    const slices = 2 * sides
    const stacks = sides

    const vertex = (i: number, j: number) => {
      const theta = i * tau / slices
      const phi = j * tau / 2 / stacks
      return Vector3.create(
        center.x + Math.sin(theta) * Math.sin(phi) * radius,
        center.y + Math.cos(theta) * Math.sin(phi) * radius,
        center.z + Math.cos(phi) * radius,
      )
    }

    return Mesh.create(
      [...Array(slices)].flatMap((_, i) =>
        [...Array(stacks)].flatMap((_, j) => {
          let vertices = []

          vertices.push(vertex(i, j))
          if(j > 0)
            vertices.push(vertex(i + 1, j))
          if(j < stacks - 1)
            vertices.push(vertex(i + 1, j + 1))
          vertices.push(vertex(i, j + 1))

          return Face.create(vertices)
        }),
      ),
    )
  },
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "SphereMesh"),
})

type SphereArgs = number | {
  radius: number,
  smooth?: Smooth,
  shift?: Triplet,
}

export const sphere: Component<[SphereArgs], Element<Sphere>> =
  Component.create("sphere", args => {
    if(typeof args === "number")
      args = { radius: args }
    const { radius, smooth = smoothContext.get() } = args
    const shift = interpretTriplet(args.shift, 0)
    const center = Vector3.multiplyScalar(shift, radius)
    return Element.create(Sphere.create(radius, smooth, center))
  }, { showOutput: false })
