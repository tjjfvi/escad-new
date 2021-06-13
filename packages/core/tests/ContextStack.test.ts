import { ContextStack, Id } from "../src"

const idA = Id.create(__filename, "@escad/core", "Test", "ContextA")
const idB = Id.create(__filename, "@escad/core", "Test", "ContextB")

test("", () => {
  const stack = new ContextStack()

  expect(stack.get(idA)).toBe(undefined)
  expect(stack.get(idB)).toBe(undefined)
  stack.set(idA, "A0")
  expect(stack.get(idA)).toBe("A0")
  expect(stack.get(idB)).toBe(undefined)
  stack.wrap(() => {
    expect(stack.get(idA)).toBe("A0")
    expect(stack.get(idB)).toBe(undefined)
    stack.set(idA, "A1")
    stack.set(idB, "B0")
    expect(stack.get(idA)).toBe("A1")
    expect(stack.get(idB)).toBe("B0")
  })
  expect(stack.get(idA)).toBe("A0")
  expect(stack.get(idB)).toBe(undefined)
})
