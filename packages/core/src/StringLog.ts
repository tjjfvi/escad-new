
import { checkTypeProperty } from "./checkTypeProperty"
import { Id } from "./Id"
import { Log, LogLevel } from "./Log"

const stringLogId = Id.create(__filename, "@escad/core", "Log", "StringLog")

export interface StringLog extends Log {
  type: typeof stringLogId,
  message: string,
}

export const StringLog = {
  id: stringLogId,
  create: (message: string, level?: LogLevel): StringLog => ({
    type: stringLogId,
    message,
    level,
  }),
  isStringLog: checkTypeProperty.id<StringLog>(stringLogId),
}
