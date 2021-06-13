import {
  Component,
  Conversion,
  conversionRegistry,
  ConvertibleTo,
  createLeafProductUtils,
  Id,
  LeafProduct,
  mapOperation,
  MarkedProduct,
  Product,
  Element,
  TupleProduct,
  TupleProductType,
  HashProduct,
  Promisish,
} from "@escad/core"
import { BoundingBox } from "./BoundingBox"
import { _boundingBox } from "./getBoundingBox"
import { Matrix4 } from "./Matrix4"
import { Mesh } from "./Mesh"
import { Transform, Transformation } from "./Transformation"
import { Vector3 } from "./Vector3"

const moveToId = Id.create(__filename, "@escad/builtins", "Marker", "MoveTo")
export type MoveTo<T extends Product> = MarkedProduct<typeof moveToId, T>
export const MoveTo = MarkedProduct.for(moveToId)

const moveToArgsId = Id.create(__filename, "@escad/builtins", "LeafProduct", "MoveToArgs")

export interface MoveToArgs extends
  LeafProduct,
  Partial<Record<"x" | "y" | "z", -1 | 0 | 1 | [toEdge: number, shift: number]>>
{
  readonly type: typeof moveToArgsId,
}

export const MoveToArgs = {
  create: (args: Omit<MoveToArgs, "type">): MoveToArgs => ({
    type: moveToArgsId,
    ...args,
  }),
  id: moveToArgsId,
  ...createLeafProductUtils<MoveToArgs, "MoveToArgs">(moveToArgsId, "MoveToArgs"),
}

export type MoveToTarget = Element<ConvertibleTo<Mesh>> | Partial<Vector3> | number

export const moveTo = Component.create(
  "moveTo",
  (target: MoveToTarget, args: Omit<MoveToArgs, "type">) => {
    if(typeof target === "number") target = { x: target, y: target, z: target }
    const targetBox: Promisish<ConvertibleTo<BoundingBox>> = Element.isElement(target)
      ? _boundingBox(target)
      : BoundingBox.fromVector3(Vector3.create(target.x ?? 0, target.y ?? 0, target.z ?? 0))
    return mapOperation<ConvertibleTo<Mesh>, ConvertibleTo<Transformation<Mesh>>>(
      "moveTo",
      async (source, allSource) =>
        Transform.create(TupleProduct.create([
          MoveTo.create(TupleProduct.create([
            MoveToArgs.create(args),
            await _boundingBox(allSource),
            await targetBox,
          ] as const)),
          HashProduct.fromProduct(source),
        ] as const)),
      { showOutput: false },
    )
  },
  { showOutput: false },
)

export const moveToX = Component.create(
  "moveToX",
  (target: MoveToTarget, toEdge: number = 0, shift: number = -Math.sign(toEdge)) =>
    moveTo(target, { x: [toEdge, shift] }),
  { showOutput: false },
)
export const moveToY = Component.create(
  "moveToY",
  (target: MoveToTarget, toEdge: number = 0, shift: number = -Math.sign(toEdge)) =>
    moveTo(target, { y: [toEdge, shift] }),
  { showOutput: false },
)
export const moveToZ = Component.create(
  "moveToZ",
  (target: MoveToTarget, toEdge: number = 0, shift: number = -Math.sign(toEdge)) =>
    moveTo(target, { z: [toEdge, shift] }),
  { showOutput: false },
)

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/builtins/moveTo": (
        | Conversion<MoveTo<TupleProduct<readonly [MoveToArgs, BoundingBox, BoundingBox]>>, Matrix4>
      ),
    }
  }
}

const moveToConversionMeshId = Id.create(__filename, "@escad/builtins", "Conversion", "MoveToConversionMesh")

conversionRegistry.register({
  id: moveToConversionMeshId,
  fromType: MoveTo.createProductType(TupleProductType.create([MoveToArgs, BoundingBox, BoundingBox])),
  toType: Matrix4,
  convert: async ({ child: { children: [args, sourceBox, targetBox] } }) => {
    const displacementVector = { x: 0, y: 0, z: 0 }
    for(const axis of ["x", "y", "z"] as const) {
      const spec = args[axis]
      if(spec === undefined) continue
      const [toEdge, shift] = typeof spec === "number" ? [spec, -spec] : spec
      const sourceCenter = sourceBox.center[axis]
      const sourceSize = sourceBox.size[axis]
      const targetCenter = targetBox.center[axis]
      const targetSize = targetBox.size[axis]
      const targetPos = targetCenter + toEdge * targetSize / 2
      const displacement = targetPos - sourceCenter + shift * sourceSize / 2
      displacementVector[axis] = displacement
    }
    return Matrix4.translate(displacementVector.x, displacementVector.y, displacementVector.z)
  },
  weight: 1,
})
