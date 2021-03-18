
import { serialize, deserialize } from "../src"
import { inspect } from "util"

let objects: unknown[] = [
  0,
  null,
  Math.SQRT1_2,
  NaN,
  undefined,
  "hello world",
  JSON.stringify({ hello: "world" }),
  // eslint-disable-next-line max-len
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent in sem porttitor, egestas lacus eu, aliquet mi. Maecenas laoreet, purus in malesuada finibus, odio lacus finibus felis, et iaculis quam dolor vel velit. Morbi vel ornare purus. Phasellus et lacus tempor, fringilla lectus nec, ullamcorper justo. Duis id porttitor massa, vel facilisis ligula. Vestibulum vitae pretium sem. Curabitur diam diam, finibus quis efficitur ut, sodales eget mi. Vestibulum sed egestas lectus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae",
  [...Array(128)].map((_, i) => String.fromCharCode(i)),
  [...Array(128)].map((_, i) => String.fromCharCode(i)).join(""),
  Buffer.from([...Array(256).keys()]),
]

objects.push({
  this: {
    is: {
      a: {
        long: {
          chain: {
            of: {
              properties: {
                oh: {
                  look: {
                    its: {
                      circular: objects,
                    },
                  },
                },
                that: {
                  is: {
                    circular: objects,
                    inWays: 2,
                  },
                },
              },
            },
          },
        },
      },
    },
  },
})

objects.push(objects)

objects.push(Object.fromEntries(objects.map(obj =>
  [serialize.hash(obj, new Map()), obj],
)))

const hashMap0 = new Map()

test("hashes", () =>
  expect(objects.map(x => serialize.hash(x, hashMap0))).toMatchSnapshot(),
)

test("objects", () =>
  expect(
    inspect(objects, { depth: Infinity }),
  ).toMatchSnapshot(),
)

const hashMap1 = new Map()
const serialized = [...serialize(objects, { hashMap: hashMap1 })]

test("serialized", () =>
  expect(
    "\n" + serialized
      .map(x => x.toString("hex"))
      .join("")
      .replace(/.{64}/g, "$&\n"),
  ).toMatchSnapshot(),
)

test("hashMap1", () =>
  expect([...hashMap1.values()]).toMatchSnapshot(),
)

const hashMap2 = new Map()
const deserialized = deserialize.withHash((async function*(){
  for(const value of serialized)
    yield value
})(), { hashMap: hashMap2 })

test("deserialized", async () =>
  expect(
    inspect(await (await deserialized).value, { depth: Infinity }),
  ).toStrictEqual(
    inspect(objects, { depth: Infinity }),
  ),
)

test("hashMap2", async () => {
  await deserialized
  expect([...hashMap2.values()]).toMatchSnapshot()
})

test("deserializeHash", async () => {
  await deserialized
  expect((await deserialized).hash).toEqual(hashMap1.get(objects))
})
