
import { ArtifactManager, ArtifactStore, Hash, Id, WrappedValue } from "../src"

const createArtifactStoreMock = (
  name: string,
  output: unknown[],
  returnValues: (WrappedValue<unknown> | null)[],
): ArtifactStore => ({
  lookupRaw: async hash => {
    output.push([name, "lookupRaw", hash])
    return returnValues.pop() ?? null
  },
  lookupRef: async loc => {
    output.push([name, "lookupRef", loc])
    return returnValues.pop() ?? null
  },
  storeRaw: async (hash, value) => {
    output.push([name, "storeRaw", hash, value])
  },
  storeRef: async (loc, hash) => {
    output.push([name, "storeRef", loc, hash])
  },
})

test("", async () => {
  const artifactManager = new ArtifactManager()
  const output = [] as unknown[]
  const store0 = createArtifactStoreMock("store0", output, [])
  const store1 = createArtifactStoreMock("store1", output, [
    WrappedValue.create({ test0: true }),
    WrappedValue.create({ test1: true }),
    WrappedValue.create({ test2: true }),
    WrappedValue.create({ test3: true }),
  ])
  const excludeStores = new Set([store1])
  artifactManager.artifactStores.push({}, store0, store1)
  const artifacts = [
    { isTestArtifact: true },
    Hash.create("test"),
    Id.create(__filename, "@escad/core", "Test", "ArtifactTest"),
  ]
  for(const artifact of artifacts) {
    await artifactManager.lookupRaw(Hash.create(artifact))
    await artifactManager.lookupRaw(Hash.create(artifact), excludeStores)
    await artifactManager.storeRaw(artifact)
    await artifactManager.storeRaw(Promise.resolve(artifact), excludeStores)
  }
  await artifactManager.lookupRef(artifacts)
  await artifactManager.lookupRef(artifacts, excludeStores)
  await artifactManager.storeRef(artifacts, artifacts[0])
  await artifactManager.storeRef([], artifacts[1], excludeStores)
  expect(output).toMatchSnapshot()
})
