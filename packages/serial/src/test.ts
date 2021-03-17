
import { serialize, deserialize } from "./index"
import { Readable } from "stream"
import fs from "fs"
import { once } from "events"

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
  console.log("deserialize")
  console.log(await deserialize(fs.createReadStream(__dirname + "/out")))
})()
