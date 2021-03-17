
import { serialize, deserialize } from "./index"
import { Readable } from "stream"
import fs from "fs"
import { once } from "events"

const value = {
  action: "sayHello",
  target: "world",
}

;(async () => {
  await once(
    Readable.from(serialize(value))
      .pipe(fs.createWriteStream(__dirname + "/out")),
    "finish",
  )
  console.log(await deserialize(fs.createReadStream(__dirname + "/out")))
})()
