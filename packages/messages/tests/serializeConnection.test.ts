import { createConnectionPair, serializeConnection } from "../src"
import { $unknown } from "@escad/serial"

test("", () => {
  const [_a, b] = createConnectionPair<Uint8Array>()
  const a = serializeConnection(_a)
  const fn = jest.fn()
  a.onMsg(fn)
  b.onMsg(fn)
  a.send(0)
  a.send({ a: "abc", b: [1, 2, 3] })
  expect(fn.mock.calls).toMatchSnapshot()
})
