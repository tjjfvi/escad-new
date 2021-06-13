import { Id } from "../src"

describe("Id.create", () => {
  test("@escad/core/Test/test0", () => {
    expect(Id.create(__filename, "@escad/core", "Test", "test0")).toMatchSnapshot()
  })
  test("Throws on duplicate", () => {
    expect(() => Id.create(__filename, "@escad/core", "Test", "test0")).toThrowErrorMatchingSnapshot()
  })
  test("Throws on incorrect package name", () => {
    expect(() => Id.create(__filename, "@escad/incorrect", "Test", "test0")).toThrowErrorMatchingSnapshot()
  })
})
