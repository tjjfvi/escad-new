
import { ArtifactManager } from "./ArtifactManager"
import { Hash } from "./Hash"
import { WrappedValue } from "./WrappedValue"

export interface ArtifactStore {
  readonly storeRaw?: (hash: Hash<unknown>, artifact: WrappedValue, artifactManager: ArtifactManager) => Promise<void>,
  readonly storeRef?: (loc: readonly unknown[], hash: Hash<unknown>, artifactManager: ArtifactManager) => Promise<void>,
  readonly lookupRaw?: (hash: Hash<unknown>, artifactManager: ArtifactManager) => Promise<WrappedValue | null>,
  readonly lookupRef?: (loc: readonly unknown[], artifactManager: ArtifactManager) => Promise<WrappedValue | null>,
}
