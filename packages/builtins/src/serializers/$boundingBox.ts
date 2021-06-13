import { registerType, Serializer } from "@escad/serial"
import { BoundingBox } from "../BoundingBox"
import { $vector3 } from "./$vector3"

export const $boundingBox = new Serializer<BoundingBox>({
  *s(box){
    yield* $vector3.s(box.min)
    yield* $vector3.s(box.max)
  },
  *d(){
    const min = yield* $vector3.d()
    const max = yield* $vector3.d()
    return BoundingBox.create(min, max)
  },
})

registerType(BoundingBox.id, $boundingBox)
