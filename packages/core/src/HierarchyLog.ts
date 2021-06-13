
import { checkTypeProperty } from "./checkTypeProperty"
import { Hierarchy } from "./Hierarchy"
import { Id } from "./Id"
import { Log, LogLevel } from "./Log"

const hierarchyLogId = Id.create(__filename, "@escad/core", "Log", "HierarchyLog")

export interface HierarchyLog extends Log {
  type: typeof hierarchyLogId,
  hierarchy: Hierarchy,
}

export const HierarchyLog = {
  id: hierarchyLogId,
  create: (hierarchy: Hierarchy, level?: LogLevel): HierarchyLog => ({
    type: hierarchyLogId,
    hierarchy,
    level,
  }),
  isHierarchyLog: checkTypeProperty.id<HierarchyLog>(hierarchyLogId),
}
