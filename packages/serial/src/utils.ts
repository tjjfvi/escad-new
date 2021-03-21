
import { createHash } from "crypto"

export type Hasher = {
  update: (data: string | Buffer) => void,
  digest: () => string,
}

export const Hasher = {
  crypto: (alogrithm = "sha256"): Hasher => {
    const hash = createHash(alogrithm)
    return {
      update: data => hash.update(data),
      digest: () => hash.digest("hex"),
    }
  },
  debug: (): Hasher => {
    const data: unknown[] = []
    return {
      update: chunk => {
        if(typeof chunk === "string")
          data.push(chunk)
        else
          data.push(JSON.stringify(chunk.toString("hex")))
      },
      digest: () => `[${data}]`,
    }
  },
}

export enum Kind {
  null = 0,
  end = 1,
  string = 2,
  number = 3,
  false = 4,
  true = 5,
  object = 6,
  array = 7,
  buffer = 8,
  undefined = 9,
  MAX = 32,
}

export const endMarker = Symbol()
