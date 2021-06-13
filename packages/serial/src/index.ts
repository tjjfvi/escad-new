
import { $array } from "./$array"
import { $boolean } from "./$boolean"
import { $buffer } from "./$buffer"
import { $constant } from "./$constant"
import { $map } from "./$map"
import { $number } from "./$number"
import { $object } from "./$object"
import { $set } from "./$set"
import { $string } from "./$string"
import { registerType } from "./typeRegistration"
import { $unknown } from "./$unknown"

registerType("object", $object)
registerType("string", $string)
registerType("number", $number)
registerType("boolean", $boolean)
registerType("null", $constant(null))
registerType("undefined", $constant(undefined))
registerType("Uint8Array", $buffer)
registerType("Array", $array($unknown))
registerType("Map", $map($unknown, $unknown))
registerType("Set", $set($unknown))

// @create-index {"mode":"*"}

export * from "./$array"
export * from "./$boolean"
export * from "./$buffer"
export * from "./$constant"
export * from "./$json"
export * from "./$map"
export * from "./$number"
export * from "./$object"
export * from "./$record"
export * from "./$set"
export * from "./$string"
export * from "./$tuple"
export * from "./$unknown"
export * from "./BufferInfo"
export * from "./Serializer"
export * from "./typeRegistration"

