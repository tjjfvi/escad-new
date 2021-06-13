import { createLeafProductUtils, Id, LeafProduct } from "@escad/core"

const valueWrapperProductId = Id.create(__filename, "@escad/builtins", "LeafProduct", "ValueWrapperProduct")

export interface ValueWrapperProduct<T = unknown> extends LeafProduct {
  readonly type: typeof valueWrapperProductId,
  readonly value: T,
}

export const ValueWrapperProduct = {
  create: <T>(value: T): ValueWrapperProduct<T> => ({
    type: valueWrapperProductId,
    value,
  }),
  ...createLeafProductUtils<ValueWrapperProduct, "ValueWrapperProduct">(
    valueWrapperProductId,
    "ValueWrapperProduct",
  ),
  id: valueWrapperProductId,
}
