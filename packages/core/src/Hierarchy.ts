
import { Product } from "./Product"
import { Component } from "./Component"
import { Element } from "./Element"
import { Hash } from "./Hash"
import { Operation } from "./Operation"
import { ArrayHierarchy } from "./ArrayHierarchy"
import { CallHierarchy } from "./CallHierarchy"
import { ObjectHierarchy } from "./ObjectHierarchy"
import { NameHierarchy } from "./NameHierarchy"
import { ValueHierarchy } from "./ValueHierarchy"
import { Promisish } from "./Promisish"
import { HashProduct } from "./HashProduct"

export type HierarchyProp = Promisish<Hierarchy | undefined>

export interface _Hierarchy {
  readonly type: `${string}Hierarchy`,
  readonly linkedProducts?: readonly Hash<Product>[],
}

export type Hierarchy =
  | ObjectHierarchy
  | ArrayHierarchy
  | CallHierarchy
  | NameHierarchy
  | ValueHierarchy

export const Hierarchy = {
  isHierarchy: (value: unknown): value is Hierarchy =>
    ObjectHierarchy.isObjectHierarchy(value)
    || ArrayHierarchy.isArrayHierarchy(value)
    || CallHierarchy.isCallHierarchy(value)
    || NameHierarchy.isNameHierarchy(value)
    || ValueHierarchy.isValueHierarchy(value),
  from: async (value: unknown, raw = false): Promise<Hierarchy> => {
    value = await value
    if(
      typeof value === "string"
      || typeof value === "number"
      || typeof value === "boolean"
      || typeof value === "symbol"
      || value === undefined
      || value === null
    )
      return ValueHierarchy.from(value)
    if(!raw) {
      if(Hierarchy.isHierarchy(value))
        return value
      if(Element.isElement(value))
        return await value.hierarchy ?? Hierarchy.from(value.value)
      if(Component.isComponent(value) || Operation.isOperation(value))
        return await value.hierarchy ?? NameHierarchy.create({ name: value.name })
      if(Product.isProduct(value))
        return NameHierarchy.create({
          name: `<${value.type}>`,
          linkedProducts: [Hash.create(HashProduct.fromProduct(value))],
        })
    }
    if(value instanceof Array)
      return ArrayHierarchy.from(value, raw)
    return ObjectHierarchy.from(value as Record<string, unknown>, raw)
  },
  flattenLinkedProducts: (hierarchies: Hierarchy[]) =>
    hierarchies.flatMap(h => h.linkedProducts ?? []),
}

