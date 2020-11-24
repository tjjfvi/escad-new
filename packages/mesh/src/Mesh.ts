
import { Face } from "./Face";
import { Vector3 } from "./Vector3";
import { createProductTypeUtils, Id, LeafProduct } from "@escad/core";
import { registerPlugin } from "@escad/register-client-plugin"

declare const __meshIdSymbol: unique symbol;
const meshId = Id.create<typeof __meshIdSymbol>("Mesh", __filename);

export interface Mesh extends LeafProduct {
  readonly type: typeof meshId,
  readonly faces: readonly Face[],
}

export const Mesh = {
  create: (faces: readonly Face[]): Mesh => ({
    type: meshId,
    faces,
  }),
  fromVertsFaces: (verts: Vector3[], faces: number[][]): Mesh => Mesh.create(
    faces
      .flatMap(f => f.slice(2).map((_, i) => [f[0], f[i + 1], f[i + 2]]))
      .map(is => Face.create(is.map(i => verts[i])))
  ),
  id: meshId,
  ...createProductTypeUtils<Mesh, "Mesh">(meshId, "Mesh")
};

// registerPlugin({
//   path: require.resolve("@escad/client-mesh"),
//   idMap: { "@escad/client-mesh/Mesh": Mesh.id },
// })
