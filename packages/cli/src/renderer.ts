
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("ts-node").register()

import { artifactManager, logger } from "@escad/core"
import { parentProcessConnection, serializeConnection } from "@escad/messages"
import { createRendererServerMessenger } from "@escad/renderer"
import { FsArtifactStore } from "./FsArtifactStore"

const artifactsDir = process.env.ARTIFACTS_DIR
if(!artifactsDir) throw new Error("Renderer process was not passed environment variable ARTIFACTS_DIR")
const loadFile = process.env.LOAD_FILE
if(!loadFile) throw new Error("Renderer process was not passed environment variable LOAD_FILE")
artifactManager.artifactStores.unshift(new FsArtifactStore(artifactsDir))

createRendererServerMessenger(serializeConnection(parentProcessConnection()), () => require(loadFile), logger)
