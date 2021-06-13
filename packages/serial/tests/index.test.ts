
import {
  Serializer,
  registerType,
  $array,
  $boolean,
  $float32be,
  $float32le,
  $float64be,
  $float64le,
  $int16be,
  $int16le,
  $int32be,
  $int32le,
  $int8,
  $number,
  $string,
  $tuple,
  $uint16be,
  $uint16le,
  $uint32be,
  $uint32le,
  $uint8,
  $unknown,
  $json,
} from ".."

// eslint-disable-next-line max-len
const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
// eslint-disable-next-line max-len
const cube = { type: "Mesh", faces: [{ type: "Face", points: [{ type: "Vector3", x: 1, y: 1, z: 1 }, { type: "Vector3", x: -1, y: 1, z: 1 }, { type: "Vector3", x: 1, y: -1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: -1, y: -1, z: 1 }, { type: "Vector3", x: 1, y: -1, z: 1 }, { type: "Vector3", x: -1, y: 1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: 1, y: -1, z: -1 }, { type: "Vector3", x: -1, y: 1, z: -1 }, { type: "Vector3", x: 1, y: 1, z: -1 }] }, { type: "Face", points: [{ type: "Vector3", x: -1, y: 1, z: -1 }, { type: "Vector3", x: 1, y: -1, z: -1 }, { type: "Vector3", x: -1, y: -1, z: -1 }] }, { type: "Face", points: [{ type: "Vector3", x: 1, y: 1, z: -1 }, { type: "Vector3", x: -1, y: 1, z: 1 }, { type: "Vector3", x: 1, y: 1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: -1, y: 1, z: -1 }, { type: "Vector3", x: -1, y: 1, z: 1 }, { type: "Vector3", x: 1, y: 1, z: -1 }] }, { type: "Face", points: [{ type: "Vector3", x: 1, y: -1, z: -1 }, { type: "Vector3", x: 1, y: -1, z: 1 }, { type: "Vector3", x: -1, y: -1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: 1, y: -1, z: -1 }, { type: "Vector3", x: -1, y: -1, z: 1 }, { type: "Vector3", x: -1, y: -1, z: -1 }] }, { type: "Face", points: [{ type: "Vector3", x: -1, y: 1, z: 1 }, { type: "Vector3", x: -1, y: -1, z: -1 }, { type: "Vector3", x: -1, y: -1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: -1, y: 1, z: -1 }, { type: "Vector3", x: -1, y: -1, z: -1 }, { type: "Vector3", x: -1, y: 1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: 1, y: 1, z: -1 }, { type: "Vector3", x: 1, y: 1, z: 1 }, { type: "Vector3", x: 1, y: -1, z: 1 }] }, { type: "Face", points: [{ type: "Vector3", x: 1, y: -1, z: -1 }, { type: "Vector3", x: 1, y: 1, z: -1 }, { type: "Vector3", x: 1, y: -1, z: 1 }] }] }

interface Vector3 {
  type: "Vector3",
  x: number,
  y: number,
  z: number,
}

interface Face {
  type: "Face",
  points: [Vector3, Vector3, Vector3],
}

interface Mesh {
  type: "Mesh",
  faces: readonly Face[],
}

const $xyz = $tuple($number, $number, $number)
const $vector3 = new Serializer<Vector3>({
  s: value => $xyz.s([value.x, value.y, value.z]),
  *d(){
    const [x, y, z] = yield* $xyz.d()
    return { type: "Vector3", x, y, z }
  },
})

const $points = $tuple($vector3, $vector3, $vector3)
const $face = new Serializer<Face>({
  s: value => $points.s(value.points),
  *d(){
    const points = yield* $points.d()
    return { type: "Face", points }
  },
})

const $faces = $array($face)
const $mesh = new Serializer<Mesh>({
  s: value => $faces.s(value.faces),
  *d(){
    const faces = yield* $faces.d()
    return { type: "Mesh", faces }
  },
})

registerType("Vector3", $vector3)
registerType("Face", $face)
registerType("Mesh", $mesh)

describe.each([
  ["$uint8", $uint8, [0, 1, 255]],
  ["$uint16le", $uint16le, [0, 1, 255, 65535]],
  ["$uint16be", $uint16be, [0, 1, 255, 65535]],
  ["$uint32le", $uint32le, [0, 1, 255, 65535, 4294967295]],
  ["$uint32be", $uint32be, [0, 1, 255, 65535, 4294967295]],
  ["$int8", $int8, [-1, -128, 0, 1, 127]],
  ["$int16le", $int16le, [-1, -32768, -128, 0, 1, 127, 32767]],
  ["$int16be", $int16be, [-1, -32768, -128, 0, 1, 127, 32767]],
  ["$int32le", $int32le, [-1, -2147483648, -32768, -128, 0, 1, 127, 32767, 2147483647]],
  ["$int32be", $int32be, [-1, -2147483648, -32768, -128, 0, 1, 127, 32767, 2147483647]],
  ["$float32le", $float32le, [0, 1, 1.25, 1 / 64, 1 / 128, 1 / 65536, 1 / 4294967296, 1234567 / 8, 61 / 16, 123 / 4]],
  ["$float32be", $float32be, [0, 1, 1.25, 1 / 64, 1 / 128, 1 / 65536, 1 / 4294967296, 1234567 / 8, 61 / 16, 123 / 4]],
  ["$float64le", $float64le, [0, 1, 1.25, 1 / 64, 1 / 128, 1 / 65536, 1 / 4294967296, 1234567 / 8, 61 / 16, 123 / 4]],
  ["$float64be", $float64be, [0, 1, 1.25, 1 / 64, 1 / 128, 1 / 65536, 1 / 4294967296, 1234567 / 8, 61 / 16, 123 / 4]],
  ["$number", $number, [
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Number.EPSILON,
    Math.PI,
    Math.E,
    Math.SQRT2,
    Math.SQRT1_2,
    0,
    1,
    1000,
    2 ** 20,
    20 ** 20,
    -1.234,
    Infinity,
    -Infinity,
    NaN,
  ]],
  ["$boolean", $boolean, [true, false]],
  ["$string", $string, ["abc", "def", "xyz", "", "<NULLBYTEALERT>\0</NULLBYTEALERT>", "x".repeat(42), lorem]],
  ["$json", $json, [{ abc: "def", 123: 456 }]],
  ["$unknown", $unknown, [
    {
      x: "abc",
      y: 123,
      z: [
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        NaN,
        "Batman!",
      ],
      lorem,
      map: new Map([
        ["n", "north"],
        ["e", "east"],
        ["s", "south"],
        ["w", "west"],
        ["soggy waffles", "never eat them"],
      ]),
      set: new Set([2, 3, 5, 7, 11]),
      null: null,
      undefined: undefined,
      origin: { type: "Vector3", x: 0, y: 0, z: 0 },
      cube,
    },
  ]],
])("%s", (_name, serializer, values: any[]) => {
  test.each(values.map(x => [x] as const))("%s", value => {
    testSerializer<any>(serializer, value)
  })
})

function testSerializer<T>(serializer: Serializer<T>, value: T){
  const buffers = [...serializer.serialize(value, { chunkSize: 16 })]
  let i = 0
  let str = ""
  for(const buffer of buffers) for(const num of buffer) {
    i++
    str += (num < 16 ? "0" : "") + num.toString(16) + (i % 16 === 0 ? "\n " : " ")
  }
  expect(str.trimEnd()).toMatchSnapshot()
  const deserialized = serializer.deserialize((function*(){
    for(const buffer of buffers) {
      const chunkSize = Math.floor(Math.random() * 16) + 16
      for(let i = 0; i < buffer.length; i += chunkSize)
        yield new Uint8Array(buffer.buffer, buffer.byteOffset + i, Math.min(chunkSize, buffer.byteLength - i))
    }
  })())
  expect({ value: deserialized }).toEqual({ value })
}
