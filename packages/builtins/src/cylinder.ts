
import {
  Conversion,
  createLeafProductUtils,
  Id,
  LeafProduct,
  conversionRegistry,
  Component,
  Element,
} from "@escad/core"
import { Face } from "./Face"
import { interpretTriplet, Triplet } from "./helpers"
import { Mesh } from "./Mesh"
import { Smooth, smoothContext } from "./smoothContext"
import { Vector3 } from "./Vector3"

const tau = Math.PI * 2

const cylinderId = Id.create(__filename, "@escad/builtins", "LeafProduct", "Cylinder")

export interface Cylinder extends LeafProduct {
  readonly type: typeof cylinderId,
  readonly radius: number,
  readonly height: number,
  readonly smooth: Smooth,
  readonly center: Vector3,
}

export const Cylinder = {
  create: (radius: number, height: number, smooth: Smooth, center: Vector3): Cylinder => ({
    type: cylinderId,
    radius,
    height,
    smooth,
    center,
  }),
  ...createLeafProductUtils<Cylinder, "Cylinder">(cylinderId, "Cylinder"),
  id: cylinderId,
}

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/cylinder": {
        cylinderToMesh: Conversion<Cylinder, Mesh>,
      },
    }
  }
}

conversionRegistry.register({
  fromType: Cylinder,
  toType: Mesh,
  convert: async cyl => {
    const { radius, height, smooth, center } = cyl
    const sides = Math.max(
      2,
      smooth.sides ?? 0,
      Math.ceil(radius * tau / 2 / (smooth.size ?? Infinity)),
      360 / 2 / (smooth.angle ?? Infinity),
    )

    const h1 = center.z - height / 2
    const h2 = center.z + height / 2

    const c1 = Vector3.create(0, 0, h1)
    const c2 = Vector3.create(0, 0, h2)

    return Mesh.create([...Array(sides)].flatMap((_, i) => {
      let p1 = [Math.cos(i / sides * tau) * radius, Math.sin(i / sides * tau) * radius] as const
      let p2 = [Math.cos((i + 1) / sides * tau) * radius, Math.sin((i + 1) / sides * tau) * radius] as const
      let p11 = Vector3.create(p1[0], p1[1], h1)
      let p12 = Vector3.create(p1[0], p1[1], h2)
      let p21 = Vector3.create(p2[0], p2[1], h1)
      let p22 = Vector3.create(p2[0], p2[1], h2)
      return [
        Face.create([p21, p11, c1]),
        Face.create([c2, p12, p22]),
        Face.create([p12, p11, p22]),
        Face.create([p22, p11, p21]),
      ]
    }))
  },
  weight: 1,
  id: Id.create(__filename, "@escad/builtins", "Conversion", "CylMesh"),
})

export interface CylArgs {
  radius: number,
  height: number,
  shift?: Triplet,
  smooth?: Smooth,
}

export const cylinder: Component<[CylArgs], Element<Cylinder>> =
  Component.create("cyl", (args: CylArgs) => {
    const { radius, height, smooth = smoothContext.get() } = args
    const shift = interpretTriplet(args.shift, 0)
    const center = Vector3.multiplyComponents(shift, Vector3.create(radius, radius, height / 2))
    return Element.create(Cylinder.create(radius, height, smooth, center))
  }, { showOutput: false })

export const cyl = cylinder
