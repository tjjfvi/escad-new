
import { Mesh } from "./Mesh";
import { Vector3 } from "./Vector3";
import { Element, Component } from "@escad/core";

type PolyhedronVerts = Vector3[];
type PolyhedronFaces = number[][];
type PolyhedronArgs =
  | [PolyhedronVerts, PolyhedronFaces]
  | [{
    verts: PolyhedronVerts,
    faces: PolyhedronFaces,
  }]

export const polyhedron: Component<PolyhedronArgs, Element<Mesh>> = new Component("polyhedron", (...args) =>
  new Element(
    args.length === 2 ?
      Mesh.fromVertsFaces(...args).finish() :
      Mesh.fromVertsFaces(args[0].verts, args[0].faces).finish()
  )
);

