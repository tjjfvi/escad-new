import { Serializer } from "./Serializer"
import { $record } from "./$record"
import { $unknown } from "./$unknown"

export const $object = $record($unknown) as Serializer<object>
