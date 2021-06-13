import { $string, Serializer } from "@escad/serial"
import { Id } from "../Id"

export const $id: Serializer<Id<string, any, string>> = $string as never
