
import { serialize, deserialize } from "../src"

let objects: unknown[] = [
  0,
  null,
  Math.SQRT1_2,
  NaN,
  Number.MAX_SAFE_INTEGER,
  Number.MAX_VALUE,
  Number.MIN_SAFE_INTEGER,
  Number.MIN_VALUE,
  +Infinity,
  -Infinity,
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
                that: {
                  is: {
                    not: {
                      circular: NaN,
                    },
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

const hashMap0 = new Map()

const hashes0 = objects.map(x => serialize.hash(x, new Map()))
const hashes1 = objects.map(x => serialize.hash(x, hashMap0))
const hashes2 = objects.map(x => serialize.hash(x, hashMap0))

test("hashes", () => {
  expect(hashes0).toMatchSnapshot()
  expect(hashes1).toStrictEqual(hashes0)
  expect(hashes2).toStrictEqual(hashes1)
})

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
  expect(hashMap1).toMatchSnapshot(),
)

const hashMap2 = new Map()
const deserialized = deserialize.withHash((async function*(){
  for(const value of serialized)
    yield value
})(), { hashMap: hashMap2 })

test("deserialized", async () =>
  expect((await deserialized).value).toStrictEqual(objects),
)

test("hashMap2", async () => {
  await deserialized
  expect(hashMap2).toMatchSnapshot()
})

test("deserializeHash", async () => {
  await deserialized
  expect((await deserialized).hash).toEqual(hashMap1.get(objects))
})
