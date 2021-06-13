import { $string, Serializer } from "@escad/serial"
import { Hash } from "../Hash"

export const $hash: Serializer<Hash<any>> = $string as never
