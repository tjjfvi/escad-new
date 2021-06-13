
import { createLeafProductUtils, Id, LeafProduct, Stack } from "@escad/core"
import { Face } from "./Face"
import { Plane } from "./Plane"

const bspId = Id.create(__filename, "@escad/builtins", "LeafProduct", "Bsp")

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type PartialBsp =
  & Pick<Bsp, "type" | "faces" | "plane">
  & Mutable<Partial<Pick<Bsp, "front" | "back">>>

export enum ClipOptions {
  DropFront = 1 << 0,
  DropBack = 0,
  DropCoplanarFront = 1 << 1,
  DropCoplanarBack = 1 << 2,
  DropCoplanar = DropCoplanarFront | DropCoplanarBack,
}

export interface Bsp extends LeafProduct {
  readonly type: typeof bspId,
  readonly front: Bsp | null,
  readonly back: Bsp | null,
  readonly faces: readonly Face[],
  readonly plane: Plane | null,
}

export const Bsp = {
  create: (front: Bsp | null, back: Bsp | null, faces: readonly Face[], plane: Plane | null): Bsp => ({
    type: bspId,
    front,
    back,
    faces,
    plane: plane ?? faces[0]?.plane ?? null,
  }),
  ...createLeafProductUtils<Bsp, "Bsp">(bspId, "Bsp"),

  id: bspId,

  mapExtra: <E>(bsp: [Bsp, E], fn: (bsp: Bsp | null, extra: E) => [PartialBsp | null, [E, E] | null]) => {
    const nodeStack = new Stack<[Bsp | null, E]>([bsp])
    const buildStack = new Stack<PartialBsp | null>([])
    for(const [origNode, origExtra] of nodeStack) {
      const [mappedNode, mappedExtras] = fn(origNode, origExtra)
      if(mappedExtras && mappedNode !== null) {
        nodeStack.push([mappedNode.back ?? null, mappedExtras[1]]).push([mappedNode.front ?? null, mappedExtras[0]])
        mappedNode.front = undefined
        mappedNode.back = undefined
      }
      else if(mappedNode) {
        mappedNode.front ??= null
        mappedNode.back ??= null
      }
      let node = mappedNode
      while(node === null || node.front !== undefined && node.back !== undefined) {
        const next = buildStack.pop()
        if(next === undefined || next === null)
          break
        if(next.front === undefined)
          next.front = node as Bsp | null
        else
          next.back = node as Bsp | null
        node = next
      }
      buildStack.push(node)
    }
    const node = buildStack.pop() ?? Bsp.null()
    return node as Bsp
  },

  map: (bsp: Bsp, fn: (bsp: Bsp | null) => PartialBsp | null) =>
    Bsp.mapExtra([bsp, undefined], bsp => [fn(bsp), [undefined, undefined]]),

  invert: (bsp: Bsp): Bsp =>
    Bsp.map(bsp, bsp =>
      bsp ? {
        type: Bsp.id,
        front: bsp.back,
        back: bsp.front,
        faces: bsp.faces.map(Face.flip),
        plane: bsp.plane ? Plane.flip(bsp.plane) : null,
      } : null,
    ),

  clipFaces: arrayify(function*(bsp: Bsp, faces: readonly Face[], options: ClipOptions){
    const stack = new Stack([[bsp, faces]] as const)
    for(const [node, faces] of stack) if(node.plane) {
      const frontFaces: Face[] = []
      const backFaces: Face[] = []
      const dropFront = !!(options & ClipOptions.DropFront)
      for(const face of faces)
        Plane.splitFace(node.plane, face, {
          front: frontFaces,
          back: backFaces,
          coplanarFront: !!(options & ClipOptions.DropCoplanarFront) === dropFront ? frontFaces : backFaces,
          coplanarBack: !!(options & ClipOptions.DropCoplanarBack) === dropFront ?  frontFaces : backFaces,
        })
      if(node.front && frontFaces.length) stack.push([node.front, frontFaces])
      else if(!dropFront) yield* frontFaces
      if(node.back && backFaces.length) stack.push([node.back, backFaces])
      else if(dropFront) yield* backFaces
    }
  }),

  clipTo: (a: Bsp, b: Bsp, options: ClipOptions): Bsp =>
    Bsp.map(a, bsp =>
      bsp ? {
        ...bsp,
        faces: Bsp.clipFaces(b, bsp.faces, options),
      } : null,
    ),

  allFaces: arrayify(function*(bsp: Bsp | null){
    const stack = new Stack([bsp])
    for(const node of stack) if(node) {
      yield* node.faces
      stack.push(node.back).push(node.front)
    }
  }),

  null: () => Bsp.create(null, null, [], null),

  build: (bsp: Bsp | null, allFaces: readonly Face[]): Bsp | null =>
    Bsp.mapExtra([bsp ?? Bsp.create(null, null, [], allFaces[0].plane), allFaces], (bsp, allFaces) => {
      while(bsp && !bsp.faces.length)
        if(!(bsp.front && bsp.back))
          bsp = bsp.front ?? bsp.back
        else {
          allFaces = allFaces.concat(Bsp.allFaces(bsp))
          bsp = null
        }

      if(!allFaces.length)
        return [bsp, null]
      const plane = bsp?.plane ?? allFaces[0].plane
      const front: Face[] = []
      const back: Face[] = []
      const faces = bsp?.faces.slice() ?? []
      for(const face of allFaces)
        Plane.splitFace(plane, face, {
          coplanarFront: faces,
          coplanarBack: faces,
          front,
          back,
        })
      return [
        {
          type: Bsp.id,
          ...bsp,
          faces,
          plane,
        },
        [front, back],
      ]
    }),

  trim: (bsp: Bsp | null): Bsp | null => {
    if(!bsp) return bsp

    const front = Bsp.trim(bsp.front)
    const back = Bsp.trim(bsp.back)
    if(bsp.faces.length || (front && back))
      return Bsp.create(front, back, bsp.faces, bsp.plane)
    return front ?? back ?? null
  },
}

function arrayify<A extends any[], T>(fn: (...args: A) => Iterable<T>){
  return (...args: A) => [...fn(...args)]
}
