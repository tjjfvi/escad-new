
import "@escad/core" // register serializers, needed for talking to renderer

import { createMessenger } from "@escad/messages"
import { ServerRendererMessenger, ServerRendererShape } from "@escad/protocol"
import { Connection } from "@escad/messages"

export const createServerRendererMessenger = (
  lookupRaw: ServerRendererShape["lookupRaw"],
  connection: Connection<unknown>,
): ServerRendererMessenger =>
  createMessenger({ impl: { lookupRaw }, connection })
