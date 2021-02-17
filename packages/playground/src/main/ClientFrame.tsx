
import { brandConnection, Connection, filterConnection, mapConnection } from "@escad/messages";
import { createServerClientMessenger } from "@escad/server";
import React, { useState } from "react";
import { createBlob } from "../utils/createBlob";
import { bundlerMessenger, rendererMessenger } from "./server";
import fs from "fs";
import { getClientURL } from "../utils/getClientURL";

export const ClientFrame = () => {
  const [, setState] = useState({});
  const src = getClientURL();
  if(!src) {
    bundlerMessenger.req.onBundle()[Symbol.asyncIterator]().next().then(() => setState({}))
    return <div>Loading...</div>;
  }
  return <iframe
    src={src}
    onLoad={e => {
      if(e.currentTarget.src !== src)
        e.currentTarget.src = src;
    }}
    style={{
      flex: "1 0",
      height: "100%",
      border: "none",
    }}
    ref={iframe => {
      if(!iframe) return;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const childWindow = iframe.contentWindow!;
      const connection: Connection<unknown> = brandConnection(
        mapConnection(
          filterConnection({
            send: msg => childWindow.postMessage(msg, "*"),
            onMsg: cb => window.addEventListener("message", cb),
            offMsg: cb => window.removeEventListener("message", cb),
          }, (ev: any): ev is unknown => ev.origin === location.origin),
          x => x,
          (ev: any) => ev.data
        ),
        src,
      );
      createServerClientMessenger(
        connection,
        hash => createBlob(fs.readFileSync(`/artifacts/raw/${hash}`)),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        rendererMessenger!,
        bundlerMessenger,
      );

      // childWindow.addEventListener("mousemove", origEvent => {
      //   console.log("move")
      //   const newEvent = new CustomEvent("mousemove", { bubbles: true, cancelable: true });
      //   const { isTrusted: _, ...origEventRedacted } = origEvent;
      //   Object.assign(newEvent, origEventRedacted);
      //   iframe.dispatchEvent(newEvent)
      // })
    }}
  />
}