
export * from "./builtins";
import * as builtins from "./builtins";
import Element, { Elementish } from "./Element";
import Product from "./Product";

const escadFunc = <T extends Product>(...a: Elementish<T>[]) => {
  return new Element(a.length === 1 ? a[0] : a);
}

const escad = Object.assign(escadFunc, { ...builtins }) as typeof escadFunc & typeof builtins;

export default escad;

export { default as Component } from './Component';
export { default as Element } from './Element';
export { default as Hierarchy } from './Hierarchy';
export { default as Id } from './Id';
export { default as Operation } from './Operation';
export { default as Product } from './Product';
export { default as Work } from './Work';
export { default as ProductManager } from './ProductManager';
export * from './Component';
export * from './Element';
export * from './Hierarchy';
export * from './Id';
export * from './Operation';
export * from './Product';
export * from './Work';

