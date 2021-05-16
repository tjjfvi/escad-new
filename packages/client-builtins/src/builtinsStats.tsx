
import { Face, getBoundingBox, Mesh, Vector3 } from "@escad/builtins"
import { registerProductStat } from "@escad/client"
import { Id } from "@escad/core"

registerProductStat({
  id: Id.create(__filename, "@escad/client-builtins", "Stat", "Size", "0"),
  label: "Size",
  productType: Mesh,
  value: async meshes => {
    const boundingBox = await getBoundingBox(meshes)
    const { size } = boundingBox
    return `${round(size.x)}×${round(size.y)}×${round(size.z)}`
  },
  weight: 1,
})

registerProductStat({
  id: Id.create(__filename, "@escad/client-builtins", "Stat", "Faces", "0"),
  label: "Faces",
  productType: Mesh,
  value: meshes => {
    const faces = meshes.map(mesh => mesh.faces.length).reduce((a, b) => a + b, 0)
    const triangles = meshes.flatMap(mesh =>
      mesh.faces.map(face =>
        face.points.length - 2,
      ),
    ).reduce((a, b) => a + b, 0)
    return `${faces} (${triangles} tris)`
  },
  weight: 1,
})

registerProductStat({
  id: Id.create(__filename, "@escad/client-builtins", "Stat", "Volume", "0"),
  label: "Volume",
  productType: Mesh,
  value: meshes => `${round(calculateMeshStats(meshes).volume)} u³`,
  weight: 1,
})

registerProductStat({
  id: Id.create(__filename, "@escad/client-builtins", "Stat", "Surface Area", "0"),
  label: "Surface Area",
  productType: Mesh,
  value: meshes => `${round(calculateMeshStats(meshes).surfaceArea)} u²`,
  weight: 1,
})

function calculateMeshStats(meshes: Mesh[]): { volume: number, surfaceArea: number }{
  const triangles = meshes.flatMap(mesh => mesh.faces.flatMap(Face.toTriangles))
  return triangles.flatMap(triangle => {
    const faceNormal = triangle.plane.normal
    const [a, b, c] = triangle.points
    const edges = [
      [a, b, 1],
      [a, c, -1],
      [b, a, -1],
      [b, c, 1],
      [c, a, 1],
      [c, b, -1],
    ] as const
    return edges.map(([p, q, d]) => {
      const edgeDirection = Vector3.unit(Vector3.subtract(q, p))
      const edgeNormal = Vector3.multiplyScalar(Vector3.unit(Vector3.cross(edgeDirection, faceNormal)), d)
      const surfaceArea = -Vector3.dot(p, edgeDirection) * Vector3.dot(p, edgeNormal) / 2
      const volume = surfaceArea * Vector3.dot(p, faceNormal) / 3
      return { surfaceArea, volume }
    })
  }).reduce((a, b) => ({
    surfaceArea: a.surfaceArea + b.surfaceArea,
    volume: a.volume + b.volume,
  }), { surfaceArea: 0, volume: 0 })
}

function round(x: number){
  return Math.round(x * 1000) / 1000
}
