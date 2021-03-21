
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

export class Stack<T> {

  private arr: T[] = []

  get length(){
    return this.arr.length
  }

  pop(): T | undefined{
    return this.arr.pop()
  }

  peek(): T | undefined{
    return this.arr[this.arr.length - 1]
  }

  push(...values: T[]){
    for(let i = values.length - 1; i >= 0; i--)
      this.arr.push(values[i])
  }

  [Symbol.iterator](){
    return {
      next: () =>
        this.length
          ? { value: this.pop() as T, done: false }
          : { done: true },
    }
  }

}
