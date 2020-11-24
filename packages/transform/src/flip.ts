
import {
  Id,
  LeafProduct,
  createProductTypeUtils,
  Product,
  CompoundProduct,
  Conversion,
  Operation,
  mapOperation,
} from "@escad/core";
import { Mesh, Face } from "@escad/mesh";

declare const flipFacesProductIdSymbol: unique symbol;
const flipFacesProductId = Id.create<typeof flipFacesProductIdSymbol>("FlipFacesProduct", __filename);

export interface FlipFacesProduct extends LeafProduct {
  readonly type: typeof flipFacesProductId,
}

export const FlipFacesProduct = {
  create: () => ({ type: flipFacesProductId }),
  ...createProductTypeUtils<FlipFacesProduct, "FlipFacesProduct">(flipFacesProductId, "FlipFacesProduct"),
  id: flipFacesProductId,
};

export type FlipFaces<T extends Product> = CompoundProduct<readonly [FlipFacesProduct, T]>;
export const FlipFaces = {
  create: <T extends Product>(p: T): FlipFaces<T> =>
    CompoundProduct.create([FlipFacesProduct.create(), p])
};

declare global {
  namespace escad {
    interface ConversionsObj {
      "@escad/transform/flip": {
        flipMesh: Conversion<FlipFaces<Mesh>, Mesh>,
      },
    }
  }
}

Product.ConversionRegistry.register<FlipFaces<Mesh>, Mesh>({
  convert: async ({ children: [, mesh] }) =>
    Mesh.create(mesh.faces.map(face =>
      Face.create(face.points.slice().reverse())
    )),
  fromType: [FlipFacesProduct.id, Mesh.id],
  toType: Mesh.id,
})

export const flip: Operation<Mesh, FlipFaces<Mesh>> = mapOperation<Mesh, FlipFaces<Mesh>>("flip", FlipFaces.create);
