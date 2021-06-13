
import { Vector3 } from "./Vector3"
import { Face } from "./Face"
import { createLeafProductUtils, Id, LeafProduct } from "@escad/core"

const epsilon = 1e-5

const planeId = Id.create(__filename, "@escad/builtins", "LeafProduct", "Plane")
export interface Plane extends LeafProduct {
  readonly type: typeof planeId,
  readonly normal: Vector3,
  readonly w: number,
}

export interface SplitFaceArguments {
  front: Face[],
  back: Face[],
  coplanarFront: Face[],
  coplanarBack: Face[],
}

export const Plane = {
  id: planeId,
  create: _Plane,
  ...createLeafProductUtils<Plane, "Plane">(planeId, "Plane"),
  flip: (plane: Plane): Plane => Plane.create(Vector3.negate(plane.normal), -plane.w),
  splitFace(plane: Plane, face: Face, { front, back, coplanarFront, coplanarBack }: SplitFaceArguments){
    const Coplanar = 0
    const Front = 1
    const Back = 2
    const Spanning = 3

    let faceType = 0
    let types = face.points.map(v => {
      let t = Vector3.dot(plane.normal, v) - plane.w
      let type = t < -epsilon ? Back : t > epsilon ? Front : Coplanar
      faceType |= type // Bitwise or
      return type
    })

    switch(faceType) {
      case Coplanar:
        (Vector3.dot(plane.normal, face.plane.normal) > 0 ? coplanarFront : coplanarBack).push(face)
        break
      case Front:
        front.push(face)
        break
      case Back:
        back.push(face)
        break
      case Spanning: {
        let f: Vector3[] = []
        let b: Vector3[] = []
        face.points.map((vi, i, a) => {
          let j = (i + 1) % a.length
          let ti = types[i]
          let tj = types[j]
          let vj = a[j]
          if(ti !== Back) f.push(vi)
          if(ti !== Front) b.push(vi)
          if((ti | tj) !== Spanning) // Bitwise or
            return
          let t = (plane.w - Vector3.dot(plane.normal, vi)) / Vector3.dot(plane.normal, Vector3.subtract(vj, vi))
          let v = Vector3.lerp(vi, vj, t)
          f.push(v)
          b.push(v)
        })
        if(f.length > 2)
          front.push(Face.create(f))
        if(b.length > 2)
          back.push(Face.create(b))
      }
    }
  },
}

function _Plane(normal: Vector3, w: number): Plane
function _Plane(points: readonly Vector3[], w?: number): Plane
function _Plane(points: readonly Vector3[] | Vector3, w?: number): Plane{
  if(!(points instanceof Array))
    return {
      type: planeId,
      normal: points,
      w: w ?? 0,
    }
  let [a, b, c] = points
  const normal = Vector3.unit(Vector3.cross(Vector3.subtract(b, a), Vector3.subtract(c, a)))
  return { type: planeId, normal, w: Vector3.dot(normal, a) }
}
