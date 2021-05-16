
import { CallHierarchy } from "./CallHierarchy"
import { checkTypeProperty } from "./checkTypeProperty"
import { contextStack } from "./ContextStack"
import { ExtensibleFunction } from "./ExtensibleFunction"
import { Hierarchy, HierarchyProp } from "./Hierarchy"
import { Hkt } from "./Hkt"
import { NameHierarchy } from "./NameHierarchy"
import { Thing, StripRealm } from "./Thing"

export interface Component<I extends any[], O extends Thing> {
  readonly type: "Component",
  readonly func: (...input: I) => O,
  readonly name: string,
  readonly hierarchy?: HierarchyProp,
  readonly overrideHierarchy?: boolean,
  readonly showOutput?: boolean,
  readonly info: Record<string, any>,
  (...args: I): StripRealm<O>,
}

export interface ComponentOpts {
  readonly hierarchy?: HierarchyProp,
  readonly overrideHierarchy?: boolean,
  readonly showOutput?: boolean,
  readonly info?: Record<string, any>,
}

export const Component = {
  isComponent: checkTypeProperty.string<Component<any, any>>("Component"),
  create: <I extends any[], O extends Thing>(
    name: string,
    func: (...args: I) => O,
    { hierarchy, overrideHierarchy = true, showOutput = true, info = {} }: ComponentOpts = {},
  ): Component<I, O> => {
    const that = Object.assign(
      new ExtensibleFunction(
        (...args: I) => {
          const result = contextStack.wrap(() => func(...args))
          return Thing.applyHierarchy(result, createHierarchy(result, args))
        },
        {},
        name,
      ),
      {
        type: "Component" as const,
        func,
        overrideHierarchy,
        hierarchy,
        showOutput,
        info,
      },
    ) as Component<I, O>
    return that

    async function createHierarchy(result: O, args: I){
      if(!overrideHierarchy)
        return result.hierarchy
      return CallHierarchy.create({
        operator: await hierarchy ?? NameHierarchy.create({ name }),
        operands: await Promise.all(args.map(x => Hierarchy.from(x))),
        result: showOutput ? await result.hierarchy : undefined,
        composable: false,
        linkedProducts: (await Hierarchy.from(result)).linkedProducts,
      })
    }
  },
  applyHierarchy: <I extends any[], O extends Thing>(
    component: Component<I, O>,
    hierarchy?: HierarchyProp,
  ) =>
    Component.create(component.name, component.func, {
      ...component,
      hierarchy,
    }),
}

declare const __genericComponent__: unique symbol

export type GenericComponent<T extends GenericConstraint, I extends Hkt<[...T], any[]>, O extends Hkt<[...T], Thing>> =
  & Omit<Component<Hkt.Output<I, T>, Hkt.Output<O, T>>, "func">
  & {
    readonly func: <
      U0 extends T[0],
      U1 extends T[1],
      U2 extends T[2],
      U3 extends T[3],
      U4 extends T[4],
  >(...args: Hkt.Output<I, _GCU<T, U0, U1, U2, U3, U4>>) => Hkt.Output<O, _GCU<T, U0, U1, U2, U3, U4>>,
    <
      U0 extends T[0],
      U1 extends T[1],
      U2 extends T[2],
      U3 extends T[3],
      U4 extends T[4],
    >(...args: Hkt.Output<I, _GCU<T, U0, U1, U2, U3, U4>>): StripRealm<Hkt.Output<O, _GCU<T, U0, U1, U2, U3, U4>>>,
    // Component shouldn't be assignable to GenericComponent
    readonly [__genericComponent__]: never,
  }

export type GenericConstraint = [unknown?, unknown?, unknown?, unknown?, unknown?]
export type _GCU<
  T extends GenericConstraint,
  U0 extends T[0],
  U1 extends T[1],
  U2 extends T[2],
  U3 extends T[3],
  U4 extends T[4],
> = {
  [K in keyof T]: K extends keyof GenericConstraint & `${number}` ? [U0, U1, U2, U3, U4][K] : T[K]
} & T

export const GenericComponent = {
  create: <T extends GenericConstraint, I extends Hkt<[...T], any[]>, O extends Hkt<[...T], Thing>>(
    name: string,
    func: <
      U0 extends T[0],
      U1 extends T[1],
      U2 extends T[2],
      U3 extends T[3],
      U4 extends T[4],
    >(...args: Hkt.Output<I, _GCU<T, U0, U1, U2, U3, U4>>) => Hkt.Output<O, _GCU<T, U0, U1, U2, U3, U4>>,
    opts?: ComponentOpts,
  ): GenericComponent<T, I, O> =>
    Component.create<Hkt.Output<I, T>, Hkt.Output<O, T>>(name, func, opts) as never,
  applyHierarchy: <T extends GenericConstraint, I extends Hkt<[...T], any[]>, O extends Hkt<[...T], Thing>>(
    component: GenericComponent<T, I, O>,
    hierarchy?: Hierarchy,
  ) =>
    GenericComponent.create<T, I, O>(component.name, component.func, { ...component, hierarchy }),
}
