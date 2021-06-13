import { Serializer } from "./Serializer"

export const $tuple =
  <T extends Serializer<any>[]>(
    ...serializers: [...T]
  ) => new Serializer<{ [K in keyof T]: T[K] extends Serializer<infer U> ? U : never }>({
    *s(value){
      if(value.length !== serializers.length)
        throw new Error("Incorrect tuple length passed to tuple.s")
      for(let i = 0; i < serializers.length; i++)
        yield* serializers[i].s(value[i] as never)
    },
    *d(){
      const tuple = Array(serializers.length)
      for(let i = 0; i < serializers.length; i++)
        tuple[i] = yield* serializers[i].d()
      return tuple as any
    },
  })
