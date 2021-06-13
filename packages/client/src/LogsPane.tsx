import "../stylus/LogsPane.styl"
import { IdView } from "./IdView"
import { observer, useFromProm } from "rhobo"
import React, { useContext } from "react"
import { Id, Log } from "@escad/core"
import { ClientState } from "./ClientState"
import { Pane } from "./Pane"
import { Loading } from "./Loading"

export interface LogTypeRegistration<T extends Log> {
  id: T["type"],
  className?: string,
  component: (props: { log: T }) => JSX.Element | null,
}

const logTypeRegistrations = new Map<Id, LogTypeRegistration<any>>()

export const registerLogType = async <T extends Log>(registration: LogTypeRegistration<T>) => {
  if(logTypeRegistrations.has(registration.id))
    throw new Error(`Duplicate LogTypeRegistration for id ${registration.id}`)
  logTypeRegistrations.set(registration.id, registration)
}

const LogView = ({ log: logPromise }: { log: Promise<Log> }) => {
  const log = useFromProm.use(logPromise)()
  if(!log)
    return <div className="Log loading">
      <Loading/>
    </div>
  const registration = logTypeRegistrations.get(log.type)
  if(!registration)
    return <div className="Log none">
      <span>Cannot display log</span>
      <IdView id={log.type}/>
    </div>
  return <div className={"Log " + (registration.className ?? "")}>
    <registration.component {...{ log }}/>
  </div>
}

export const LogsPane = observer(() => {
  const state = useContext(ClientState.Context)

  return <Pane right name="Logs">
    {state.logs().map((log, i) => <LogView key={i} log={log}/>)}
    <div/>
  </Pane>
})
