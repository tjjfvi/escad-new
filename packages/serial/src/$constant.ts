/* eslint-disable require-yield */

import { Serializer } from "./Serializer"

export const $constant = <T>(value: T) => new Serializer<T>({
  *s(v: T){
    if(v !== value)
      throw new Error("Expected to be passed a constant")
  },
  *d(){
    return value
  },
})
