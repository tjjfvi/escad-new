import { $unknown, Serializer } from "@escad/serial"
import { WrappedValue } from "../WrappedValue"

export const $wrappedValue = new Serializer<WrappedValue>({
  s: ({ value }) => $unknown.s(value),
  *d(){
    const value = yield* $unknown.d()
    return WrappedValue.create(value)
  },
})
