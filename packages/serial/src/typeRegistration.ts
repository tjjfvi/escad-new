import { Serializer } from "./Serializer"

export const registeredTypes: Record<string, Serializer<any>> = Object.create(null)

export function registerType<T>(type: string, serializer: Serializer<T>){
  if(type in registeredTypes)
    throw new Error(`Duplicate serializer registration for type ${type}`)
  registeredTypes[type] = serializer
}
