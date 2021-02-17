
import { Compiler, Stats } from "webpack"
import { Connection, createEmittableAsyncIterable, createMessenger } from "@escad/messages";
import { BundleOptions, BundlerServerMessenger } from "@escad/protocol";
import { hash, Hash } from "@escad/core";
import { writeFile } from "fs-extra";
import stylus from "stylus";
import path from "path";
import fs from "fs";

export const createBundlerServerMessenger = (
  connection: Connection<unknown>,
  createCompiler: (options: BundleOptions, entryPaths: string[]) => Compiler,
): BundlerServerMessenger => {
  const [emitBundle, onBundle] = createEmittableAsyncIterable<Hash>();

  let watcher: ReturnType<Compiler["watch"]> | undefined;

  let lastOptionsHash: Hash | undefined;

  return createMessenger({
    bundle,
    onBundle,
  }, connection);

  async function bundle(options: BundleOptions){
    const optionsHash = hash(options);
    if(optionsHash === lastOptionsHash)
      return;
    lastOptionsHash = optionsHash;

    const entryPaths = [options.coreClientPath, ...options.clientPlugins.map(reg => reg.path)];

    watcher?.close(() => {});
    watcher = undefined;

    const compiler = createCompiler(options, entryPaths);

    // @ts-ignore: fix for running in browser
    compiler.inputFileSystem.join = fs.join;

    const handler = (err: Error | undefined, result: Stats | undefined) => {
      if(err) console.error(err);
      const bundleHash = hash(result?.compilation.fullHash ?? Math.random());
      writeFile(path.join(options.outDir, "bundle.hash"), bundleHash);
      emitBundle(bundleHash);
    }

    if(options.watch ?? false)
      watcher = compiler.watch({}, handler);
    else
      compiler.run(handler);
  }
}

const literal = (value: string) => {
  const literal = new stylus.nodes.Literal(value);
  literal.filename = "globals.styl";
  return literal;
}

export const stylusGlobals: unknown = {
  $black: literal("#151820"),
  $darkgrey: literal("#252830"),
  $grey: literal("#454850"),
  $lightgrey: literal("#656870"),
  $white: literal("#bdc3c7"),
  $red: literal("#c0392b"),
  $orange: literal("#d35400"),
  $yellow: literal("#f1c40f"),
  $green: literal("#2ecc71"),
  $blue: literal("#0984e3"),
  $purple: literal("#8e44ad"),
};