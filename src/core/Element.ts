
import ExtensibleFunction from "./ExtensibleFunction";
import { Leaf } from "./Work";
import Hierarchy from "./Hierarchy";
import Operation from "./Operation";
import Component from "./Component";
import Product from "./Product";

type $T = Component<any, any> | Operation<any, any> | Element<any>;

interface ObjMap<T> {
  [x: string]: T;
}
type ElementishFlat<T> = Array<T> | ObjMap<T>;
type Elementish<T extends Product> = Array<Elementish<T>> | ObjMap<Elementish<T>> | Leaf<T> | Element<T>;
type DeepArray<T> = Array<T | DeepArray<T>>;

type ElementRet<T extends Product, A extends any> =
  A extends Operation<T, infer U> ? Element<U> :
  // @ts-ignore
  A extends Component<infer I, infer U> ? Component<I, ElementRet<T, U>> :
  never

export interface Element<T extends Product> {
  (): Element<T>,
  <U extends Product>(o: Operation<T, U>): Element<U>,
  <I extends any[], U extends $T>(c: Component<I, U>): ElementRet<T, Component<I, U>>,
}

export class Element<T extends Product> extends ExtensibleFunction {

  val: ElementishFlat<Element<T>> | Leaf<T>;
  hierarchy: Hierarchy;

  constructor(c: Elementish<T>, h: Hierarchy = Hierarchy.fromElementish(c)) {
    super(arg => {
      if (!arg)
        return that;
      if (arg instanceof Operation)
        return arg(that);
      if (arg instanceof Component)
        return new Component<any, any>(arg.name + "'", (...args) => that(arg(...args)))
      throw new Error("Invalid argument to Element");
    })
    let that = this;
    if (c instanceof Array)
      this.val = c.map(x => new Element(x));
    type $T = Component<any, any> | Operation<any, any> | Element<any>;
    if (c.constructor === Object)
      this.val = Object.assign(Object.create(null), ...Object.entries(c).map(([k, v]) => ({ [k]: new Element(v) })));
    if (c instanceof Element)
      this.val = c.val;
    else
      // @ts-ignore
      this.val = c;
    this.hierarchy = h;
  }

  map<U extends Product>(f: (x: Leaf<T>) => Elementish<T>): Element<U> {
    if (this.val instanceof Array)
      return new Element<U>(this.val.map(v => v.map<U>(f)));
    if (this.val && this.val.constructor === Object)
      return new Element<U>(Object.assign({}, ...Object.entries(this.val).map(([k, v]) => ({
        [k]: v instanceof Element ? v.map<U>(f) : v,
      }))));
    else
      // @ts-ignore
      return new Element(f(this.val));
  }

  toArray(): Array<Element<T>> | T {
    if (this.val instanceof Array)
      return this.val;
    if (this.val.constructor === Object)
      return Object.values(this.val);
    // @ts-ignore
    return this.val;
  }

  toArrayDeep(): DeepArray<T> | T {
    let arr = this.toArray();
    return (arr instanceof Array ? arr.map(e => e.toArrayDeep()) : arr);
  }

  toArrayFlat(): Array<T> {
    let arr = this.toArray();
    return (arr instanceof Array ? arr.flatMap(e => e.toArrayFlat()) : [arr]);
  }

}

export default Element;
export type { Elementish };
