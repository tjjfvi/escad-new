
import { Hash, Id, ArtifactStore, WrappedValue, $wrappedValue } from "@escad/core"
import { join, dirname } from "path"
import fs from "fs"
import { promisify } from "util"
import stream, { Readable } from "stream"

const symlink = promisify(fs.symlink)
const mkdir = promisify(fs.mkdir)
const pipeline = promisify(stream.pipeline)

export class FsArtifactStore implements ArtifactStore {

  constructor(public rootDir: string){}

  async storeRaw(hash: Hash<unknown>, value: WrappedValue){
    const path = await this.getPathRaw(hash)
    const writeStream = fs.createWriteStream(path, { flags: "wx" })
    pipeline(
      Readable.from($wrappedValue.serialize(value)),
      writeStream,
    ).catch(() => null)
  }

  async storeRef(loc: readonly unknown[], hash: Hash<unknown>){
    const fromPath = await this.getPathRef(loc)
    const toPath = await this.getPathRaw(hash)
    await symlink(toPath, fromPath).catch(() => null)
  }

  async lookupRaw(hash: Hash<unknown>){
    const path = await this.getPathRaw(hash)
    return await $wrappedValue.deserializeAsync(fs.createReadStream(path)).catch(() => null)
  }

  async lookupRef(loc: readonly unknown[]){
    const path = await this.getPathRef(loc)
    return await $wrappedValue.deserializeAsync(fs.createReadStream(path)).catch(() => null)
  }

  private async getPathRaw(hash: Hash<unknown>){
    const path = join(this.rootDir, "raw", hash)
    this.mkdirp(dirname(path))
    return path
  }

  private async getPathRef(loc: readonly unknown[]){
    const path = join(this.rootDir, ...loc.map(x => Id.isId(x) ? x.replace(/\//g, "-") : Hash.create(x)))
    await mkdir(dirname(path), { recursive: true })
    return path
  }

  private async mkdirp(path: string){
    await mkdir(path, { recursive: true })
  }

}
