
import { WeakCache } from "./WeakCache"
import { Hash } from "./Hash"
import { ArtifactStore } from "./ArtifactStore"
import { timers } from "./Timer"
import { deserialize, serialize } from "@escad/serial"

const timedSerialize = timers.serialize.time(serialize)
const timedDeserialize = timers.deserialize.time(deserialize.sync)

export class ArtifactManager {

  private cache = new WeakCache<unknown, unknown>()

  artifactStores: ArtifactStore[] = []

  private serialize(artifact: unknown): Buffer{
    return artifact instanceof Buffer
      ? artifact
      : Buffer.concat([...timedSerialize(artifact, { hashMap: Hash.hashMap, hasher: Hash.hasher })])
  }

  private deserialize(buffer: unknown): unknown{
    if(!(buffer instanceof Buffer)) return buffer
    try {
      return timedDeserialize([buffer], { hashMap: Hash.hashMap, hasher: Hash.hasher })
    }
    catch (e) {
      return buffer
    }
  }

  async storeRaw<T>(
    artifactPromise: T | Promise<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    const artifact = await artifactPromise
    const artifactHash = Hash.create(artifact)

    this.cache.set(artifactHash, () => artifact)

    let serialized
    await Promise.all(this.artifactStores.map(async s =>
      !excludeStores?.has(s) && await s.storeRaw?.(artifactHash, serialized ??= this.serialize(artifact), this),
    ))

    return artifactHash
  }

  async storeRef<T>(
    loc: readonly unknown[],
    artifactPromise: T | Promise<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    const artifact = await artifactPromise
    const artifactHash = Hash.create(artifact)

    this.cache.set(loc, () => artifact)

    await Promise.all<any>([
      this.storeRaw(artifact, excludeStores),
      ...loc.map(l => this.storeRaw(l, excludeStores)),
      ...this.artifactStores.map(s =>
        !excludeStores?.has(s) && s.storeRef?.(loc, artifactHash, this),
      ),
    ])

    return artifactHash
  }

  async lookupRaw<T>(
    hash: Hash<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ): Promise<T | null>{
    for(const store of this.artifactStores)
      if(!excludeStores?.has(store)) {
        const buffer = await store.lookupRaw?.(hash, this)
        if(!buffer) continue
        const artifact = this.deserialize(buffer)
        const receivedHash = Hash.create(artifact)
        if(hash === receivedHash)
          return artifact as T
        else {
          console.log(JSON.stringify(artifact))
          throw new Error(`Received incorrect value from lookupRaw; expected hash ${hash}, received ${receivedHash}`)
        }
      }
    return null
  }

  async lookupRef(
    loc: readonly unknown[],
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    for(const store of this.artifactStores)
      if(!excludeStores?.has(store)) {
        const buffer = await store.lookupRef?.(loc, this)
        if(buffer) {
          const artifact = this.deserialize(buffer)
          await this.storeRaw(artifact, excludeStores)
          return this.deserialize(buffer)
        }
      }
    return null
  }

}

export const artifactManager = new ArtifactManager()
