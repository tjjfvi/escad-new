import { $number, $tuple, registerType, Serializer } from "@escad/serial"
import { Vector3 } from "../Vector3"

const $xyz = $tuple($number, $number, $number)
export const $vector3 = new Serializer<Vector3>({
  s: vector => $xyz.s([vector.x, vector.y, vector.z]),
  *d(){
    const [x, y, z] = yield* $xyz.d()
    return Vector3.create(x, y, z)
  },
})

registerType(Vector3.id, $vector3)
