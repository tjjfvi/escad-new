import { Serializer } from "./Serializer"
import { $string } from "./$string"
import { registeredTypes } from "./typeRegistration"

const primitiveProtos = new Set([
  Object.prototype,
  Function.prototype,
  Object.getPrototypeOf(async () => {}),
  Object.getPrototypeOf(function*(){}),
  Object.getPrototypeOf(async function*(){}),
])

export const $unknown = new Serializer<unknown>({
  *s(value){
    const type = getType(value)
    const $value = registeredTypes[type]
    if(!$value)
      throw new Error(`Cannot serialize value of type ${type}`)
    yield* $string.s(type)
    yield* $value.s(value)

    function getType(value: unknown): string{
      if(typeof value !== "object" && typeof value !== "function")
        return typeof value
      if(value === null)
        return "null"
      if("type" in value) {
        const type = value["type" as never] as unknown
        if(typeof type === "string" && type in registeredTypes)
          return type
      }
      const proto = Object.getPrototypeOf(value)
      if(!proto?.constructor?.name || primitiveProtos.has(proto))
        return "object"
      return proto.constructor.name
    }
  },
  *d(){
    const type = yield* $string.d()
    const $value = registeredTypes[type]
    if(!$value)
      throw new Error(`Cannot deserialize value of type ${type}`)
    const value = yield* $value.d()
    return value
  },
})
