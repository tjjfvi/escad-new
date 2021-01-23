
import { Face } from "./Face";
import { Vector3 } from "./Vector3";
import { createProductTypeUtils, Id, LeafProduct } from "@escad/core";
import { registerPlugin } from "@escad/register-client-plugin"

const meshId = Id.create(__filename, "@escad/mesh", "0", "Mesh");

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
  ...createProductTypeUtils<Mesh, "Mesh">(meshId, "Mesh")
};

registerPlugin({
  path: require.resolve("@escad/client-mesh"),
})
