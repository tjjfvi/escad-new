import { $number, $tuple, Serializer } from "@escad/serial"
import { Matrix4, Sixteen } from "../Matrix4"

const $sixteen: Serializer<Sixteen<number>> = $tuple(
  $number, $number, $number, $number,
  $number, $number, $number, $number,
  $number, $number, $number, $number,
  $number, $number, $number, $number,
)

export const $matrix4 = new Serializer<Matrix4>({
  s: matrix4 => $sixteen.s(matrix4.vs),
  *d(){
    const vs = yield* $sixteen.d()
    return Matrix4.create(vs)
  },
})
