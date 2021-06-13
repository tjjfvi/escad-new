
import { ArtifactStore } from "./ArtifactStore"
import { Hash } from "./Hash"
import { HashMap } from "./HashMap"
import { WrappedValue } from "./WrappedValue"

export class InMemoryArtifactStore implements ArtifactStore {

  readonly raw = new Map<Hash<unknown>, WrappedValue>()
  readonly ref = new HashMap<readonly unknown[], Hash<unknown>>()

  async storeRaw(hash: Hash<unknown>, value: WrappedValue){
    this.raw.set(hash, value)
  }

  async lookupRaw(hash: Hash<unknown>){
    console.log(this.raw)
    return this.raw.get(hash) ?? null
  }

  async storeRef(loc: readonly unknown[], hash: Hash<unknown>){
    this.ref.set(loc, hash)
  }

  async lookupRef(loc: readonly unknown[]){
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.raw.get(this.ref.get(loc)!) ?? null
  }

}
