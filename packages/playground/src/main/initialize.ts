// @ts-nocheck

import path = require("path")

path.resolve = path.resolve.bind(path)

const { dirname } = path
import fs = require("fs")
import fsConstants = require("fs-constants")
import util = require("util")
import EventEmitter = require("events")
import url = require("url")
import { promisify } from "util"
import stylusStdLib from "!!raw-loader!stylus/lib/functions/index.styl"
import { escadPackageTgzs } from "../utils/escadPackages"

declare const BrowserFS: any

url.URL = URL

path.posix = path
path.win32 = path

let fsPromiseResolve
export const fsPromise = new Promise(res => fsPromiseResolve = res)

if(self.document)
  BrowserFS.configure({
    fs: "MountableFileSystem",
    options: {
      "/packages": {
        fs: "OverlayFS",
        options: {
          readable: {
            fs: "XmlHttpRequest",
            options: {
              baseUrl: "/packages",
              index: Object.fromEntries(escadPackageTgzs.map(x => [x, null])),
            },
          },
          writable: {
            fs: "InMemory",
          },
        },
      },
    },
  }, err => {
    if(err) throw err
    else fsPromiseResolve()
  })
else
  BrowserFS.configure({
    fs: "WorkerFS",
    options: { worker: self },
  }, err => {
    if(err) throw err
    else fsPromiseResolve()
  })

self.fs = fs

fs.mocked = true
fs.constants = fsConstants
fs.copyFile = () => {}
fs.promises = {
  stat: util.promisify(fs.stat),
}
fs.symlink = (a, b, ...args) =>
  fs.readFile(a, (err, data) => err ? args[args.length - 1](null) : fs.writeFile(b, data, args[args.length - 1]))
fs.symlinkSync = () => {}
fs.chmod = (_, _1, c) => c()
fs.chmodSync = () => {}
const fsWrite = fs.write
fs.write = (fd, buf, offset = 0, length = buf.length - offset, position, cb) => {
  fsWrite(fd, buf, offset, length, position, (...args) => {
    cb(...args)
    const fdInfo = fds[fd]
    fd in fds && fs.closeSync(fd)
    fds[fd] = fdInfo
  })
}
const fsWriteSync = fs.writeSync
fs.writeSync = (fd, buf, offset = 0, length = buf.length - offset, position) => {
  fsWriteSync(fd, buf, offset, length, position)
  const fdInfo = fds[fd]
  fd in fds && fs.closeSync(fd)
  fds[fd] = fdInfo
}
fs.join = path.posix.join
fs.unlink = (_, cb) => cb(null)
const fsRmdir = fs.rmdir
fs.rmdir = (...args) => fsRmdir(args[0], { recursive: true }, args[args.length - 1])
const fsMkdir = fs.mkdir
const fsMkdirProm = promisify(fs.mkdir)
fs.mkdir = async (...args) => {
  if(!(typeof args[1] === "object" && args[1].recursive))
    return fsMkdir(...args)
  // Adapted from <https://stackoverflow.com/a/40686853>
  let dir = "/"
  for(const child of args[0].split("/").filter(x => x !== "")) {
    dir = path.resolve(dir, child)
    try {
      await fsMkdirProm(dir, ...args.slice(1, -1))
    }
    catch (e) {
      if(e.code === "EEXIST") continue
      args[args.length - 1](e)
      return
    }
  }
  args[args.length - 1](null)
}
const fsReadFileSync = fs.readFileSync
fs.readFileSync = (path, ...args) => {
  if(path === "/bundled/node_modules/stylus/lib/functions/index.styl")
    return stylusStdLib
  return fsReadFileSync(path, ...args)
}

export const fsEventEmitter = new EventEmitter()

Object.keys(fs).filter(x => typeof fs[x] === "function").forEach(x => {
  const orig = fs[x]
  fs[x] = (...args) => {
    // if(x === "writeFile")
    //   console.log(x, ...args);
    fsEventEmitter.emit("*", x, ...args)
    fsEventEmitter.emit(x, ...args)
    return orig(...args)
  }
})

process.binding = x => x === "fs" ? fs : null
process.getMaxListeners = () => Infinity
process.versions = { node: "0.0.0" }
process.browser = true
process.stderr = {}
process.hrtime = ([a] = [0]) => [Date.now() / 1000 | 0 - a, 0]

const webpackLoaderMap = {}
Object.entries({
  /* eslint-disable */
  "stylus-loader": [require("stylus-loader"), require.resolve("stylus-loader")],
  "css-loader": [require("css-loader"), require.resolve("css-loader"), [
    ["dist/runtime/cssWithMappingToString.js", require("!!raw-loader!css-loader/dist/runtime/cssWithMappingToString.js").default],
    ["dist/runtime/api.js", require("!!raw-loader!css-loader/dist/runtime/api.js").default],
  ]],
  "style-loader": [require("style-loader"), require.resolve("style-loader"), [
    ["dist/runtime/injectStylesIntoStyleTag.js", require("!!raw-loader!style-loader/dist/runtime/injectStylesIntoStyleTag").default]
  ]],
  "stylus": [require("stylus"), require.resolve("stylus"), [
    ["lib/functions/index.styl", stylusStdLib]
  ]]
  /* eslint-enable */
}).forEach(([name, [exports, path, extraFiles = []]]) => {
  path = path.slice(`./node_modules/${name}/`.length)
  if(self.document) {
    mkdirpSync(`/bundled/node_modules/${name}/${dirname(path)}`)
    fs.writeFileSync(`/bundled/node_modules/${name}/package.json`, `{"main":"./${path}","name":"${name}"}`)
    fs.writeFileSync(`/bundled/node_modules/${name}/${path}`, "// Stub")
    extraFiles.forEach(([path, content]) => {
      console.log(`/bundled/node_modules/${name}/${path}`)
      mkdirpSync(`/bundled/node_modules/${name}/${dirname(path)}`)
      fs.writeFileSync(`/bundled/node_modules/${name}/${path}`, content)
    })
  }
  webpackLoaderMap[`/bundled/node_modules/${name}/${path}`] = exports
})

function mkdirpSync(path: string){
  path.split("/").slice(1).map((_, i, a) => "/" + a.slice(0, i + 1).join("/")).map(x => {
    try {
      fs.mkdirSync(x)
    }
    catch (e) {
      e
    }
  })
}

global.__webpackLoaderMap = path => {
  if(path in webpackLoaderMap)
    return webpackLoaderMap[path]
  console.log(webpackLoaderMap)
  throw new Error(`Could not find loader "${path}"`)
}

export const fds: Record<number, { _path: string }> = fs.getFSModule().fdMap

self.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args)

import rendererSource from "!!raw-loader!../workers/renderer.js"
import createBlobSource from "!!raw-loader!../utils/createBlob.js"
import fakeImportAllEscadSource from "!!raw-loader!../utils/fakeImportAllEscad.js"
import { createResourceFile } from "../utils/resourceFiles"
import { observable } from "rhobo"
import { ReadableWebToNodeStream } from "readable-web-to-node-stream"
import tar from "tar"
import { once } from "events"

if(self.document) {
  fs.mkdirSync("/resourceFiles")
  createResourceFile(rendererSource)
  createResourceFile(fakeImportAllEscadSource)
  fs.mkdirSync("/utils")
  fs.writeFileSync("/utils/createBlob.js", createBlobSource)
}

export const loadingStatuses = observable<{ text: string }[]>([])

export const addLoadingStatus = async <T, >(text: string, fn: () => Promise<T>): Promise<T> => {
  const status = { text }
  loadingStatuses([...loadingStatuses.value, status])
  const result = await fn()
  loadingStatuses(loadingStatuses.value.filter(x => x !== status))
  return result
}

export const installProjectPromise = (async () => {
  if(!self.document)
    return
  fs.mkdirSync("/project")
  await addLoadingStatus("Unpacking project", async () => {
    const response = await fetch(location.origin + "/bundled/project.tar")
    const stream = new ReadableWebToNodeStream(response.body)
    await once(stream.pipe(tar.extract({})), "close")
  })
})()
