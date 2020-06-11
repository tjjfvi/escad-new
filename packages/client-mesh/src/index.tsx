
import { registerViewerRegistration, Id } from "@escad/client";
import { viewer3d, colors, EdgesGeometry } from "@escad/client-3d-viewer";
import * as t from "three";

console.log("HI!!")

registerViewerRegistration({
  id: Id.get("8d44037fdc8ff4cc6e2479e6aa485d9868fc8a16efb89ee9d52f2b211d223c60"),
  context: viewer3d,
  map: product => {
    const buf = product.buffer.slice(2);
    let arr = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
    let attr = new t.BufferAttribute(arr, 3);
    let geo = new t.BufferGeometry();
    geo.setAttribute("position", attr);
    geo.computeVertexNormals();
    let mat = new t.MeshBasicMaterial({
      color: colors.darkgrey,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    let inMat = new t.MeshBasicMaterial({
      color: colors.red,
      side: t.BackSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    // @ts-ignore
    let lines = new t.LineSegments(new EdgesGeometry(geo), new t.LineBasicMaterial({ color: colors.white }))
    let mesh = new t.Mesh(geo, mat);
    let inMesh = new t.Mesh(geo, inMat);
    let group = new t.Group();
    group.add(lines);
    group.add(mesh);
    group.add(inMesh);
    lines.visible = false;
    setTimeout(() => {
      lines.visible = true;
    }, 0)
    return {
      product,
      group,
    };
  }
})
