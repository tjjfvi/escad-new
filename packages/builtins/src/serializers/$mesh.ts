import { $array, registerType, Serializer } from "@escad/serial"
import { Mesh } from "../Mesh"
import { $face } from "./$face"

const $faces = $array($face)
export const $mesh = new Serializer<Mesh>({
  s: mesh => $faces.s(mesh.faces),
  *d(){
    const faces = yield* $faces.d()
    return Mesh.create(faces)
  },
})

registerType(Mesh.id, $mesh)
