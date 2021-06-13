import { checkTypeProperty, Id } from "../src"

describe("checkTypeProperty", () => {
  const fnTrue = checkTypeProperty((v): v is unknown => true)
  const fnFalse = checkTypeProperty((v): v is never => false)

  test("Doesn't match non-object", () => {
    expect(fnTrue(5)).toBe(false)
    expect(fnTrue("string")).toBe(false)
    expect(fnTrue(undefined)).toBe(false)
  })

  test("Doesn't match null", () => {
    expect(fnTrue(null)).toBe(false)
  })

  test("Doesn't match missing `type` property", () => {
    expect(fnTrue({})).toBe(false)
    expect(fnTrue(() => {})).toBe(false)
  })

  test("Matches valid `type` property", () => {
    expect(fnTrue({ type: "whatever" })).toBe(true)
    expect(fnTrue(Object.assign(() => {}, { type: "whatever" }))).toBe(true)
  })

  test("Doesn't match invalid `type` property", () => {
    expect(fnFalse({ type: "whatever" })).toBe(false)
    expect(fnFalse(Object.assign(() => {}, { type: "whatever" }))).toBe(false)
  })
})

test("checkTypeProperty.string", () => {
  expect(checkTypeProperty.string("test")({ type: "test" })).toBe(true)
  expect(checkTypeProperty.string("test")({ type: "wrong" })).toBe(false)
})

test("checkTypeProperty.id", () => {
  const testId = Id.create(__filename, "@escad/core", "Test", "ctpi")
  const wrongId = Id.create(__filename, "@escad/core", "Test", "ctpiw")
  expect(checkTypeProperty.id(testId)({ type: testId })).toBe(true)
  expect(checkTypeProperty.id(testId)({ type: "wrong" })).toBe(false)
  expect(checkTypeProperty.id(testId)({ type: wrongId })).toBe(false)
})

test("checkTypeProperty.idScope", () => {
  const testId = Id.create(__filename, "@escad/core", "Test", "ctpis")
  const wrongId = Id.create(__filename, "@escad/core", "Wrong", "ctpis")
  expect(checkTypeProperty.idScope("Test")({ type: testId })).toBe(true)
  expect(checkTypeProperty.idScope("Test")({ type: "wrong" })).toBe(false)
  expect(checkTypeProperty.idScope("Test")({ type: wrongId })).toBe(false)
})
