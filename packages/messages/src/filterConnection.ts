
import { Connection } from "./Connection"

export const filterConnection =
  <T, U0, U1 extends U0>(connection: Connection<T, U0>, filter: (v: U0) => v is U1): Connection<T, U1> => ({
    send: connection.send,
    onMsg: origCb => connection.onMsg(v => filter(v) && origCb(v)),
    destroy: connection.destroy,
  })
