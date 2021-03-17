
import { Readable } from "stream"
import fs from "fs"
import { once } from "events"
import { deserialize } from "./deserialize"
import { serialize } from "./serialize"

const value = {
  a: { w: 0, x: 1, y: 2, z: 3 },
  b: { w: 0, x: 1, y: 2, z: 3 },
}

const hashMap = new WeakMap<any, string>()

;(async () => {
  console.log("serialize")
  await once(
    Readable.from(serialize(value, { hashMap }))
      .pipe(fs.createWriteStream(__dirname + "/out")),
    "finish",
  )
  console.log(hashMap.get(value))
  console.log("deserialize")
  const value2 = await deserialize(fs.createReadStream(__dirname + "/out"), { hashMap })
  console.log(value2)
  console.log(hashMap.get(value2))
})()
