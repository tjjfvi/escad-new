import { $number, registerType, Serializer } from "@escad/serial"
import { Plane } from "../Plane"
import { $vector3 } from "./$vector3"

export const $plane = new Serializer<Plane>({
  *s(plane){
    yield* $vector3.s(plane.normal)
    yield* $number.s(plane.w)
  },
  *d(){
    const normal = yield* $vector3.d()
    const w = yield* $number.d()
    return Plane.create(normal, w)
  },
})

registerType(Plane.id, $plane)
