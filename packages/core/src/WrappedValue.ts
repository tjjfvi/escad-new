
export declare const __wrappedValue: unique symbol
export type __wrappedValue = typeof __wrappedValue

export type WrappedValue<T = unknown> = { value: T, [__wrappedValue]: undefined }

const wrappedValueMemo = new WeakMap<object, { value: unknown }>()

export const WrappedValue = {
  create: <T>(value: T): WrappedValue<T> => {
    if(value === null || typeof value !== "object" && typeof value !== "function")
      return { value } as WrappedValue<T>
    const existing = wrappedValueMemo.get(value as never)
    if(existing) return existing as WrappedValue<T>
    const wrappedValue = { value } as WrappedValue<T>
    wrappedValueMemo.set(value as never, wrappedValue)
    return wrappedValue
  },
}
