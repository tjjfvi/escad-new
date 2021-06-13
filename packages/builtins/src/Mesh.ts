
import { Face } from "./Face"
import { Vector3 } from "./Vector3"
import { createLeafProductUtils, Id, LeafProduct } from "@escad/core"

const meshId = Id.create(__filename, "@escad/builtins", "LeafProduct", "Mesh")

export interface Mesh extends LeafProduct {
  readonly type: typeof meshId,
  readonly faces: readonly Face[],
}

export const Mesh = {
  create: (faces: readonly Face[]): Mesh => ({
    type: meshId,
    faces,
  }),
  fromVertsFaces: (verts: Vector3[], faces: number[][]): Mesh =>
    Mesh.create(faces.map(is => Face.create(is.map(i => verts[i])))),
  id: meshId,
  ...createLeafProductUtils<Mesh, "Mesh">(meshId, "Mesh"),
}
