
import { noopConnection } from "../src";

test("", () => {
  const [a, b] = noopConnection<number>();
  const fn0 = jest.fn();
  const fn1 = jest.fn();
  const fn2 = jest.fn();
  const fn3 = jest.fn();
  a.send(-1)
  a.onMsg(fn0);
  a.send(-1);
  b.send(0);
  b.onMsg(fn1);
  a.send(1);
  b.onMsg(fn2);
  a.send(2);
  a.onMsg(fn3);
  b.onMsg(fn3);
  a.send(3);
  b.send(4);
  a.offMsg(fn0);
  a.offMsg(fn1);
  b.send(5)
  b.offMsg(fn1)
  a.send(6);
  expect([fn0, fn1, fn2, fn3].map(f => f.mock.calls)).toMatchSnapshot();
})