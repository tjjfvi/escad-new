
import { WeakCache } from "./WeakCache"
import { Hash } from "./Hash"
import { ArtifactStore } from "./ArtifactStore"
import { WrappedValue } from "./WrappedValue"
import { Counter, Timer } from "./Timer"

export class ArtifactManager {

  private excludeStoresCaches = new WeakMap<ReadonlySet<ArtifactStore>, WeakCache<Hash<unknown>, WrappedValue | null>>()
  private defaultCache = new WeakCache<string, WrappedValue | null>()

  artifactStores: ArtifactStore[] = []

  timers = Timer.create({
    storeRaw: Timer.create(),
    storeRef: Timer.create(),
    lookupRaw: Timer.create({ calls: Counter.create() }),
    lookupRef: Timer.create({ calls: Counter.create() }),
    getRefCacheKey: Timer.create(),
  })

  async storeRaw<T>(
    artifactPromise: T | Promise<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    const artifact = await artifactPromise

    this.timers.storeRaw.start()
    const artifactHash = Hash.create(artifact)

    this.getCache(excludeStores).set(artifactHash, WrappedValue.create(artifact))

    await Promise.all(this.artifactStores.map(async s => {
      if(!excludeStores?.has(s))
        await s.storeRaw?.(artifactHash, WrappedValue.create(artifact), this)
    }))

    this.timers.storeRaw.end()
    return artifactHash
  }

  async storeRef<T>(
    loc: readonly unknown[],
    artifactPromise: T | Promise<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    this.getCache(excludeStores).setAsync(
      this.getRefCacheKey(loc),
      Promise.resolve(WrappedValue.create(artifactPromise)),
    )
    const artifact = await artifactPromise

    this.timers.storeRef.start()
    const artifactHash = Hash.create(artifact)

    await Promise.all<unknown>([
      this.storeRaw(artifact, excludeStores),
      ...loc.map(l => this.storeRaw(l, excludeStores)),
      ...this.artifactStores.map(s => {
        if(!excludeStores?.has(s))
          s.storeRef?.(loc, artifactHash, this)
      }),
    ])

    this.timers.storeRef.end()
    return artifactHash
  }

  async lookupRaw<T>(
    hash: Hash<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    const result = await this.lookupRawWrapped(hash, excludeStores)
    if(result) return result.value
    return null
  }

  lookupRawWrapped<T>(
    hash: Hash<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    this.timers.lookupRaw.calls.increment()
    return this.getCache(excludeStores).getAsync(
      hash,
      this.timers.lookupRaw.timeFn(async (): Promise<WrappedValue<T> | null> => {
        for(const store of this.artifactStores)
          if(!excludeStores?.has(store)) {
            const artifact = await store.lookupRaw?.(hash, this)
            if(artifact && Hash.check(hash, artifact.value))
              return artifact as WrappedValue<T>
          }
        return null
      }),
    ) as Promise<WrappedValue<T> | null>
  }

  async lookupRef(
    loc: readonly unknown[],
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    const result = await this.lookupRefWrapped(loc, excludeStores)
    if(result) return result.value
    return null
  }

  lookupRefWrapped(
    loc: readonly unknown[],
    excludeStores?: ReadonlySet<ArtifactStore>,
  ): Promise<WrappedValue | null>{
    this.timers.lookupRef.calls.increment()
    return this.getCache(excludeStores).getAsync(
      this.getRefCacheKey(loc),
      this.timers.lookupRef.timeFn(async () => {
        for(const store of this.artifactStores)
          if(!excludeStores?.has(store)) {
            const artifact = await store.lookupRef?.(loc, this)
            if(artifact) {
              await this.storeRaw(artifact.value, excludeStores)
              return artifact
            }
          }
        return null
      }),
    )
  }

  async computeRef<T>(
    loc: readonly unknown[],
    func: () => Promise<T>,
    excludeStores?: ReadonlySet<ArtifactStore>,
  ){
    const stored = await this.lookupRefWrapped(loc, excludeStores)
    if(stored) return stored.value as T
    const result = func()
    this.storeRef(loc, result, excludeStores)
    return await result
  }

  private getCache(excludeStores?: ReadonlySet<ArtifactStore>){
    if(!excludeStores?.size)
      return this.defaultCache
    const existing = this.excludeStoresCaches.get(excludeStores)
    if(existing) return existing
    const cache = new WeakCache<Hash<unknown>, WrappedValue>()
    this.excludeStoresCaches.set(excludeStores, cache)
    return cache
  }

  private getRefCacheKey(loc: readonly unknown[]){
    this.timers.getRefCacheKey.start()
    let key = ""
    for(const part of loc)
      if(typeof part === "string")
        key += part + "//"
      else
        key += Hash.create(part) + "//"
    this.timers.getRefCacheKey.end()
    return key
  }

}

export const artifactManager = new ArtifactManager()
