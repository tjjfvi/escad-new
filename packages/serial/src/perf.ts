
import { serialize } from "./serialize"
import { deserialize } from "./deserialize"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const testObj = require("../large.json")

const hashMap = new WeakMap()

const arr = []

for(const chunk of serialize(testObj, { hashMap }))
  arr.push(chunk)

console.log(arr.length)

console.log(
  deserialize.sync(arr, { hashMap }),
  hashMap,
)

setInterval(() => {})
