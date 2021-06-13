import { Context, ContextStack, Id } from "../src"

const id = Id.create(__filename, "@escad/core", "Context", "test")

test("", () => {
  const contextStack = new ContextStack()
  const context = new Context(id, "0", contextStack)
  expect(context.get()).toBe("0")
  context.set("1")
  expect(context.get()).toBe("1")
  context.wrap("2", () => {
    expect(context.get()).toBe("2")
    context.set("3")
    expect(context.get()).toBe("3")
  })
  expect(context.get()).toBe("1")
})
