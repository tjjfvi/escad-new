/* eslint-disable array-element-newline */

import { createLeafProductUtils, Id, LeafProduct } from "@escad/core"
import { Vector3 } from "./Vector3"

const c = Math.cos
const s = Math.sin
const S = (x: number) => -Math.sin(x)

export type Sixteen<T> = [
  T, T, T, T,
  T, T, T, T,
  T, T, T, T,
  T, T, T, T,
]

const matrix4Id = Id.create(__filename, "@escad/builtins", "LeafProduct", "Matrix4")

export interface Matrix4 extends LeafProduct {
  readonly type: typeof matrix4Id,
  readonly vs: Sixteen<number>,
}

export const Matrix4 = {
  create: (vs: Sixteen<number>): Matrix4 => ({
    type: Matrix4.id,
    vs,
  }),
  ...createLeafProductUtils<Matrix4, "Matrix4">(matrix4Id, "Matrix4"),

  id: matrix4Id,

  multiplyVector: (matrix: Matrix4, vector: Vector3) => {
    let v = [vector.x, vector.y, vector.z]
    let m = matrix.vs
    return Vector3.create(
      v[0] * m[0] + v[1] * m[1] + v[2] * m[2] + m[3],
      v[0] * m[4] + v[1] * m[5] + v[2] * m[6] + m[7],
      v[0] * m[8] + v[1] * m[9] + v[2] * m[10] + m[11],
    )
  },

  multiply: (a: Matrix4, b: Matrix4) => {
    const _get = (t: Matrix4) => (i: number, j: number) => t.vs[i * 4 + j]
    const getA = _get(a)
    const getB = _get(b)
    const cellValue = (i: number, j: number) =>
      [0, 1, 2, 3].map(x => getA(i, x) * getB(x, j)).reduce((a, b) => a + b)
    return Matrix4.create(a.vs.map((_, x) => cellValue(Math.floor(x / 4), x % 4)) as Sixteen<number>)
  },

  scale: (x: number, y: number, z: number) =>
    Matrix4.create([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1,
    ]),

  rotateX: (t: number) =>
    Matrix4.create([
      1, 0, 0, 0,
      0, c(t), S(t), 0,
      0, s(t), c(t), 0,
      0, 0, 0, 1,
    ]),

  rotateY: (t: number) =>
    Matrix4.create([
      c(t), 0, s(t), 0,
      0, 1, 0, 0,
      S(t), 0, c(t), 0,
      0, 0, 0, 1,
    ]),

  rotateZ: (t: number) =>
    Matrix4.create([
      c(t), s(t), 0, 0,
      S(t), c(t), 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]),

  translate: (x: number, y: number, z: number) =>
    Matrix4.create([
      1, 0, 0, x,
      0, 1, 0, y,
      0, 0, 1, z,
      0, 0, 0, 1,
    ]),
}
