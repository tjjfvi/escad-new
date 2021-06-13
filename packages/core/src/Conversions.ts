
import { __hash } from "./Hash"
import { ScopedId } from "./Id"
import { Product, ProductType, ProductTypeish } from "./Product"

export interface Conversion<A, B> {
  (value: A): B,
}

export interface ConversionImpl<A extends Product, B extends Product> {
  readonly convert: (value: A) => Promise<B>,
  readonly fromType: ProductType<A>,
  readonly toType: ProductType<B>,
  readonly weight: number,
  readonly id?: ScopedId<"Conversion">,
}

export interface ConversionImplish<A extends Product, B extends Product> {
  readonly convert: (value: A) => Promise<B>,
  readonly fromType: ProductTypeish<A>,
  readonly toType: ProductTypeish<B>,
  readonly weight: number,
  readonly id: ScopedId<"Conversion">,
}

type Values<T> = T[keyof T]

declare global {
  namespace escad {
    interface ConversionsObj { }
  }
}

export type ConversionsUnion<C = escad.ConversionsObj> = Values<{
  [K in keyof C]: C[K] extends Conversion<any, any> ? C[K] : ConversionsUnion<C[K]>
}>

export type ConversionImpls<C = ConversionsUnion> = (
  C extends Conversion<infer A, infer B>
    ? A extends Product
      ? B extends Product
        ? ConversionImpl<Extract<A, Product>, Extract<B, Product>>
        : never
      : never
    : never
)

export type DirectConvertibleTo<T, C = ConversionsUnion> =
  C extends Conversion<infer F, infer T2>
    ? Omit<T2, __convertibleTo> extends T
      ? Omit<F, __convertibleTo>
      : never
    : never

export declare const __convertibleTo: unique symbol
export declare const __convertibleToOverride: unique symbol
export declare const __convertibleToTransitivityOverride: unique symbol
export type __convertibleTo = typeof __convertibleTo
export type __convertibleToOverride = typeof __convertibleToOverride
export type __convertibleToTransitivityOverride = typeof __convertibleToTransitivityOverride

// A is assignable to B, and B is assignable to C, but A is not assignable to C
export namespace TransitivityOverride {
  export type A = (x?: true) => never
  export type B = () => true
  export type C = (x?: false) => boolean
}

type Match<T, U> = keyof U extends keyof T ? Pick<T, keyof U> extends U ? true : false : false

type _ImplicitlyConvertibleTo<A> = A extends A ?
  | Match<A, { type: "TupleProduct" }> extends true
    ? "children" extends keyof A
      ? {
        readonly type: "TupleProduct",
        readonly children: {
          readonly [K in keyof A["children"] & (number | `${number}`)]: _ConvertibleTo<A["children"][K]>
        },
      }
      : never
  : Match<A, { type: "ArrayProduct" }> extends true
    ? "children" extends keyof A ? number extends keyof A["children"]
      ? {
        readonly type: "ArrayProduct",
        readonly children: readonly _ConvertibleTo<A["children"][number]>[],
      }
      | {
        readonly type: "TupleProduct",
        readonly children: Readonly<Record<number, _ConvertibleTo<A["children"][number]>>>,
      }
      : never : never
  : Match<A, { type: "MarkedProduct" }> extends true
    ? "child" extends keyof A
      ? {
        readonly type: "MarkedProduct",
        readonly child: _ConvertibleTo<A["child"]>,
      }
      : never
  : Match<A, { type: "HashProduct" }> extends true
    ? "hash" extends keyof A
      ? __hash extends keyof A["hash"]
        ? _ConvertibleTo<Omit<A["hash"][__hash], __convertibleTo>>
        : never
      : never
  : A
: never

export type _ConvertibleTo<T, E=never> =
  T extends T
    ? __convertibleToOverride extends keyof T
      ? _ConvertibleTo<Unphantom<T[__convertibleToOverride]>>
      : _ImplicitlyConvertibleTo<T>
      | (
        T extends E
          ? never
          : _ConvertibleTo<DirectConvertibleTo<_ImplicitlyConvertibleTo<T>>, E | T>
      )
      | {
        [__convertibleTo]?: _ConvertibleTo<T, E> | T[Extract<__convertibleTo, keyof T>],
        [__convertibleToTransitivityOverride]?: TransitivityOverride.C,
      }
    : never

// Preserves type info but does not affect assignability
export interface Phantom<T> { _: Phantom<T> }
export type Unphantom<T> = T extends Phantom<infer U> ? U : never

export type ConvertibleTo<T extends Product> = Product & {
  [__convertibleToTransitivityOverride]?: TransitivityOverride.B,
  [__convertibleToOverride]?: Phantom<T>,
  [__convertibleTo]?: T[__convertibleTo],
}

/* Tests */

// import { ArrayProduct, LeafProduct, TupleProduct, __Element__, Elementish } from ".";

// declare global {
//   namespace escad {
//     interface ConversionsObj {
//       stuff: (
//         | Conversion<ProductA, ProductB>
//         | Conversion<ProductB, ProductA>
//         | Conversion<ArrayProduct<ProductA>, ProductA>
//       ),
//     }
//   }
// }

// type Assert<T, U extends T> = U;
// interface ProductA extends LeafProduct {
//   a: 5,
// }
// interface ProductB extends LeafProduct {
//   b: 5,
// }
// interface ProductC extends LeafProduct {
//   c: 5,
// }

// type _ = [A, B, C, E, F, G, W<Product>, X__<Product>, X_<Product, Product>, X, Y, Y_<Product, Product>, Z, __]
// type __ = _;

// type A = Assert<ConvertibleTo<ArrayProduct<ProductA>>, ArrayProduct<ProductB>>
// // @ts-expect-error anti-axiom
// type B = Assert<ConvertibleTo<ArrayProduct<ProductA>>, ArrayProduct<ProductC>>
// type C = Assert<
//   ConvertibleTo<ArrayProduct<ProductA>>,
//   TupleProduct<[ProductA, TupleProduct<[ProductB, ProductA]>, ArrayProduct<ProductB>]>
// >
// // // @ts-expect-error anti-axiom
// // type D = Assert<ConvertibleTo<ArrayProduct<ProductA>>, TupleProduct<[]>>
// type E = Assert<ConvertibleTo<ProductA>, ArrayProduct<ConvertibleTo<ProductA>>>;
// type F = Assert<ConvertibleTo<ProductA>, TupleProduct<ConvertibleTo<ProductA>[]>>;
// type G = Assert<
//   ConvertibleTo<TupleProduct<[ProductC, ProductA]>>,
//   TupleProduct<[ProductC, TupleProduct<ConvertibleTo<ProductA>[]>]>
// >;

// // type A0 = Assert<A1, A2>
// // type A1 = ConvertibleTo<TupleProduct<[ProductC, ProductA]>>;
// // type A2 = TupleProduct<[ProductC, TupleProduct<ConvertibleTo<ProductA>[]>]>;
// // type A3 = UnionToTuple<
// //   NonNullable<A2> extends infer Y ? Y extends Y ? NonNullable<A1> extends infer X ? X extends X ?
// //     Y extends X ? never : [X, Y]
// //   : never : never : never : never
// // >[0]
// // type A4 = Assert<A3[0], A3[1]>
// // type A5 = keyof A3[1]["children"]
// // type A6 = Assert<ConvertibleTo<ProductA>, ConvertibleTo<ProductB>>;

// type W<A extends Product> = Assert<_ConvertibleTo<A>, _ConvertibleTo<ConvertibleTo<A>>>;
// type X__<A extends Product> = Assert<ConvertibleTo<A>, ConvertibleTo<ConvertibleTo<A>>>;
// type X_<B extends Product, A extends ConvertibleTo<B>> = Assert<ConvertibleTo<B>, ConvertibleTo<A>>
// type X = Assert<__Element__<ProductB>, __Element__<ProductA>>
// type Y = Assert<Elementish<ProductB>, Elementish<ProductA>>
// type Y_<B extends Product, A extends ConvertibleTo<B>> = Assert<Elementish<B>, Elementish<A>>

// type Z = Assert<__Element__<ProductB>, __Element__<TupleProduct<[ProductB, ProductA]>>>

// type UnionToTuple<T> = (
//   (
//       (
//           T extends any
//               ? (t: T) => T
//               : never
//       ) extends infer U
//           ? (U extends any
//               ? (u: U) => any
//               : never
//           ) extends (v: infer V) => any
//               ? V
//               : never
//           : never
//   ) extends (_: any) => infer W
//       ? [...UnionToTuple<Exclude<T, W>>, W]
//       : []
// );
