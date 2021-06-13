
export const checkTypeProperty =
  <T extends { type: unknown }>(fn: (value: unknown) => value is T["type"]) =>
    (value: unknown): value is T =>
      (typeof value === "object" || typeof value === "function")
      && value !== null
      && "type" in value
      && fn(value["type" as never])

checkTypeProperty.string = <T extends { type: string }>(type: T["type"]) =>
  checkTypeProperty((value): value is T["type"] =>
    value === type,
  )

checkTypeProperty.id = <T extends { type: Id }>(id: T["type"]) =>
  checkTypeProperty((value): value is T["type"] =>
    value === id,
  )

checkTypeProperty.idScope =
  <T extends { type: Id }>(scope: NonNullable<T["type"][__id]>[1]) =>
    checkTypeProperty((value): value is T["type"] =>
      typeof value === "string" && Id.tryParse(value)?.scope === scope,
    )

import { Id, __id } from "./Id"
