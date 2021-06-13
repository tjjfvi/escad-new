
import { Hash } from "../src"

test("Hash.create", () => {
  expect([
    10,
    null,
    [1, 2, 3],
    { a: 1 },
  ].map(Hash.create)).toMatchSnapshot()
})

test("Hash.equal", () => {
  const obj = {}
  expect(Hash.equal(obj, obj)).toBe(true)
  expect(Hash.equal(null, null)).toBe(true)
  expect(Hash.equal(0, 0)).toBe(true)
  expect(Hash.equal({}, {})).toBe(true)
  expect(Hash.equal("abc", "abc")).toBe(true)

  expect(Hash.equal(1, 2)).toBe(false)
  expect(Hash.equal(3, {})).toBe(false)
  expect(Hash.equal("abc", "def")).toBe(false)
  expect(Hash.equal("1", 1)).toBe(false)
  expect(Hash.equal({ type: "a" }, { type: "b" })).toBe(false)
  expect(Hash.equal({ x: 1 }, {})).toBe(false)
  expect(Hash.equal({ x: 1 }, { x: 2 })).toBe(false)
  expect(Hash.equal({ x: 1 }, null)).toBe(false)
  expect(Hash.equal({ a: undefined }, {})).toBe(false)
  expect(Hash.equal(undefined, null)).toBe(false)
})

test("Hash.check", () => {
  expect(Hash.check(Hash.create(1), 2)).toBe(false)
  expect(Hash.check(Hash.create(1), 1)).toBe(true)
})
