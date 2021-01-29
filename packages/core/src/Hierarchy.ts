
import { Elementish, Element } from "./Element";
import { Product } from "./Product";
import { LeafProduct } from "./LeafProduct";
import { checkTypeProperty } from "./checkTypeProperty";
import { Component } from "./Component";
import { Operation } from "./Operation";

export type BraceType = "{" | "[" | "|" | "(" | ":" | "";

export interface HierarchyArgs {
  readonly name?: string,
  readonly braceType?: BraceType,
  readonly children?: readonly Hierarchy[],
  readonly output?: Hierarchy | null,
  readonly input?: Hierarchy | null,
  readonly fullOutput?: Hierarchy | null,
  readonly isOutput?: boolean,
  readonly isFullOutput?: boolean,
}

export interface Hierarchy extends HierarchyArgs {
  readonly type: "Hierarchy",
  readonly name: string,
  readonly braceType: BraceType,
  readonly children: readonly Hierarchy[],
  readonly output: Hierarchy | null,
  readonly input: Hierarchy | null,
  readonly fullOutput: Hierarchy | null,
  readonly isOutput: boolean,
  readonly isFullOutput: boolean,
}

export const Hierarchy = {
  create: ({
    name = "",
    braceType = "",
    children = [],
    output = null,
    input = null,
    fullOutput = null,
    isOutput = false,
    isFullOutput = false,
  }: HierarchyArgs): Hierarchy => {
    if(isOutput || isFullOutput)
      output = null;
    if(isFullOutput)
      fullOutput = null;
    if(!output && !isOutput && !isFullOutput)
      output = Hierarchy.create({
        name,
        braceType,
        input,
        children: children.map(c => c.output ?? c),
        isOutput: true,
      })
    if(!fullOutput && !isFullOutput)
      fullOutput = output?.fullOutput ?? Hierarchy.create({
        name,
        braceType,
        input,
        children: children.map(c => c.fullOutput ?? c),
        isFullOutput: true,
      })

    output = null
    fullOutput = null

    if(braceType === "" && children.length)
      throw new Error("braceType \"\" must be used without children")

    if((braceType === "{" || braceType === "[") && name !== "")
      throw new Error(`braceType "${braceType}" cannot be used with a name`);

    if(braceType === ":" && children.length !== 1)
      throw new Error("braceType \":\" must be used with exactly one child");
    return {
      type: "Hierarchy",
      name,
      braceType,
      children,
      fullOutput,
      input,
      isFullOutput,
      isOutput,
      output,
    };
  },
  isHierarchy: checkTypeProperty<Hierarchy>("Hierarchy"),
  from: (el: unknown): Hierarchy => {
    if(
      typeof el === "string" ||
      typeof el === "number" ||
      typeof el === "bigint" ||
      typeof el === "boolean" ||
      typeof el === "symbol" ||
      el === undefined ||
      el === null
    )
      return Hierarchy.create({ name: el ? el.toString() : el + "" })
    if(Hierarchy.isHierarchy(el))
      return el;
    if(el instanceof Element || el instanceof Component || el instanceof Operation)
      return el.hierarchy ?? Hierarchy.create({ name: el.name });
    if(LeafProduct.isLeafProduct(el))
      return Hierarchy.create({
        name: `<${el.type.full}>`,
      });
    if(Product.isProduct(el))
      return Hierarchy.create({
        name: `<${el.type}>`,
      });
    if(el instanceof Array)
      return Hierarchy.create({
        braceType: "[",
        children: el.map(e => Hierarchy.from(e)),
      });
    return Hierarchy.create({
      braceType: "{",
      children: Object.entries(el as any).map(([k, v]) =>
        Hierarchy.create({
          name: k,
          braceType: ":",
          children: [Hierarchy.from(v)]
        })
      )
    });
  },
  apply: <T extends Product>(hierarchy: Hierarchy, el: Elementish<T>) => new Element(el, hierarchy),
};

