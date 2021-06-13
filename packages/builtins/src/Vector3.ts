import { createLeafProductUtils, Id, LeafProduct } from "@escad/core"

const vector3Id = Id.create(__filename, "@escad/builtins", "LeafProduct", "Vector3")

export interface Vector3 extends LeafProduct {
  readonly type: typeof vector3Id,
  readonly x: number,
  readonly y: number,
  readonly z: number,
}

export const Vector3 = {
  id: vector3Id,
  create: _createVector3,
  ...createLeafProductUtils<Vector3, "Vector3">(vector3Id, "Vector3"),

  add: (a: Vector3, b: Vector3) =>
    Vector3.create(a.x + b.x, a.y + b.y, a.z + b.z),

  subtract: (a: Vector3, b: Vector3) =>
    Vector3.create(a.x - b.x, a.y - b.y, a.z - b.z),

  negate: (v: Vector3) =>
    Vector3.create(-v.x, -v.y, -v.z),

  multiplyComponents: (a: Vector3, b: Vector3) =>
    Vector3.create(a.x * b.x, a.y * b.y, a.z * b.z),

  multiplyScalar: (v: Vector3, n: number) =>
    Vector3.create(v.x * n, v.y * n, v.z * n),

  divideScalar: (v: Vector3, n: number) =>
    Vector3.multiplyScalar(v, 1 / n),

  dot: (a: Vector3, b: Vector3): number =>
    a.x * b.x + a.y * b.y + a.z * b.z,

  lerp: (a: Vector3, b: Vector3, t: number): Vector3 =>
    Vector3.add(a, Vector3.multiplyScalar(Vector3.subtract(b, a), t)),

  length: (v: Vector3): number =>
    Math.sqrt(Vector3.dot(v, v)),

  unit: (v: Vector3): Vector3 =>
    Vector3.divideScalar(v, Vector3.length(v)),

  cross: (a: Vector3, b: Vector3): Vector3 =>
    Vector3.create(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x,
    ),

  min: (a: Vector3, b: Vector3): Vector3 =>
    Vector3.create(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)),

  max: (a: Vector3, b: Vector3): Vector3 =>
    Vector3.create(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)),
}

function _createVector3(x: number, y: number, z: number): Vector3
function _createVector3(xyz: [number, number, number]): Vector3
function _createVector3(xyz: { x: number, y: number, z: number }): Vector3
function _createVector3(
  x: number | { x: number, y: number, z: number } | [number, number, number] = 0,
  y = 0,
  z = 0,
): Vector3{
  if(typeof x === "object")
    if(x instanceof Array)
      [x, y, z] = x
    else
      ({ x, y, z } = x)

  return { type: vector3Id, x, y, z }
}
