import { Serializer } from "./Serializer"

export const $boolean = new Serializer<boolean>({
  s: (value: boolean) => Serializer.write(1, ({ buffer, offset }) => buffer[offset] = +value),
  d: () => Serializer.read(1, ({ buffer, offset }) => !!buffer[offset]),
})
