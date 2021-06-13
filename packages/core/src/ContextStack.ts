
import { Id } from "./Id"

export class ContextStack {

  private root: Record<string, unknown> = Object.create(null)
  private contextMap = this.root

  wrap<U>(fn: () => U): U{
    const orig = this.contextMap
    this.contextMap = Object.create(this.contextMap)
    const result = fn()
    this.contextMap = orig
    return result
  }

  get(id: Id): unknown{
    return this.contextMap[id]
  }

  set(id: Id, value: unknown){
    this.contextMap[id] = value
  }

}

export const contextStack = new ContextStack()
