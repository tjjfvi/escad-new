import { exportTypeRegistry, Hash, Id } from "@escad/core"
import { Face } from "./Face"
import { Mesh } from "./Mesh"

exportTypeRegistry.register<Mesh>({
  id: Id.create(__filename, "@escad/builtins", "ExportType", "MeshBinaryStl"),
  name: "Binary STL",
  extension: ".stl",
  productType: Mesh,
  export: async meshes => {
    const triangles = meshes.flatMap(m => m.faces.flatMap(f => Face.toTriangles(f)))
    const buffer = Buffer.alloc(84 + triangles.length * 50)
    buffer.write("@escad/builtins/stl/" + Hash.create(meshes), "utf-8")
    buffer.writeUInt32LE(triangles.length, 80)
    let position = 84
    for(const triangle of triangles) {
      for(const vector of [triangle.plane.normal, ...triangle.points]) {
        buffer.writeFloatLE(vector.x, position)
        buffer.writeFloatLE(vector.y, position + 4)
        buffer.writeFloatLE(vector.z, position + 8)
        position += 12
      }
      position += 2
    }
    return buffer
  },
})

exportTypeRegistry.register<Mesh>({
  id: Id.create(__filename, "@escad/builtins", "ExportType", "MeshAsciiStl"),
  name: "ASCII STL",
  extension: ".stl",
  productType: Mesh,
  export: async meshes => {
    const triangles = meshes.flatMap(m => m.faces.flatMap(f => Face.toTriangles(f)))
    const name = `@escad/builtins/stl/${Hash.create(meshes)}`
    let str = ""
    str += `solid ${name}\n`
    for(const triangle of triangles) {
      str += `facet normal ${triangle.plane.normal.x} ${triangle.plane.normal.y} ${triangle.plane.normal.z}\n`
      str += "outer loop\n"
      for(const vertex of triangle.points)
        str += `vertex ${vertex.x} ${vertex.y} ${vertex.z}\n`
      str += "endloop\n"
      str += "endfacet\n"
    }
    str += `endsolid ${name}\n`
    return Buffer.from(str)
  },
})
