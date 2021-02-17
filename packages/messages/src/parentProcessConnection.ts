
import { Connection } from "./Connection";
import type { Serializable } from "child_process";

/* istanbul ignore next: covered by types, difficult to test */
export const parentProcessConnection = (): Connection<Serializable> => {
  if(!process.send)
    throw new Error("Expected to be called in a subprocess with an IPC channel")
  return {
    send: msg => process.send?.(msg),
    onMsg: cb => process.on("message", cb),
    offMsg: cb => process.off("message", cb),
  }
}