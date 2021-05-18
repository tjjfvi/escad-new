
import { assertNever, Hash } from "@escad/core"
import React, { useContext } from "react"
import { observer } from "rhobo"
import { ClientState } from "../ClientState"
import { getHierarchyPath } from "../HierarchyPath"
import { NestableSpan } from "./NestableSpan"
import { TreeText, TreeTextRange } from "./TreeText"

export interface TreeTextViewProps {
  text: TreeText,
  selectable: boolean,
  onUpdate: () => void,
}

export const TreeTextView = ({ text, selectable, onUpdate }: TreeTextViewProps) => {
  type Wrapper = {
    children: Array<string | React.ReactElement>,
    range: TreeTextRange,
  }
  let wrapperStack: Wrapper[] = [{
    children: [],
    range: TreeTextRange.Dummy(),
  }]
  for(const [index, part] of text.entries()) {
    const currentWrapper = wrapperStack[wrapperStack.length - 1]
    if(part.kind === "string") {
      currentWrapper.children.push(part.string)
      continue
    }
    if(part.kind === "ellipsis") {
      currentWrapper.children.push(
        <NestableSpan
          key={index}
          className="openable ellipsis"
          onClick={() => {
            opener.target.open = true
            onUpdate()
          }}
          children={"···"}
        />,
      )
      continue
    }
    if(part.kind === "rangeStart") {
      wrapperStack.push({
        children: [],
        range: part.range,
      })
      continue
    }
    if(part.kind === "rangeEnd") {
      const previousWrapper = wrapperStack[wrapperStack.length - 2]
      previousWrapper.children.push(
        <TreeTextPartView
          key={index}
          onUpdate={onUpdate}
          selectable={selectable}
          range={currentWrapper.range}
          children={currentWrapper.children}
        />,
      )
      wrapperStack.pop()
      continue
    }
    assertNever(part)
  }
  return <span>{wrapperStack[wrapperStack.length - 1].children}</span>
}

interface TreeTextPartViewProps {
  children: React.ReactNode,
  range: TreeTextRange,
  onUpdate: () => void,
  selectable: boolean,
}

const TreeTextPartView = observer(({ range, children, selectable }: TreeTextPartViewProps) => {
  const state = useContext(ClientState.Context)
  if(range.kind === "dummy")
    return <>{children}</>
  if(range.kind === "selectable") {
    if(!selectable)
      return <>{children}</>
    const { path } = range
    const selectionClass = getSelectionClass() ?? ""
    return <NestableSpan
      className={"selectable " + selectionClass}
      onClick={event => {
        if(event.ctrlKey || event.metaKey || event.altKey)
          state.selection([
            ...(state.selection.value ?? []),
            {
              type: event.altKey ? "exclude" : "include",
              path,
            },
          ])
        else
          state.selection([{
            type: "include",
            path,
          }])
      }}
      children={children}
    />

    function getSelectionClass(){
      const hierarchy = state.hierarchy()
      if(!hierarchy) return
      const linkedProducts = getHierarchyPath(path, hierarchy)?.linkedProducts
      if(!linkedProducts) return
      const resolvedSelection = state.resolvedSelection()
      if(!resolvedSelection) return
      const selectionStates = linkedProducts.map(x => resolvedSelection.get(x))
      const directly = findLast(state.selection() ?? [], x => Hash.equal(x.path, path))?.type ?? null
      const someNull = selectionStates.some(x => x == null)
      const included = selectionStates.some(x => x === true)
      const excluded = selectionStates.some(x => x === false)
      return `directly-${directly} someNull-${someNull} included-${included} excluded-${excluded}`
    }
  }
  assertNever(range)
})

/** Like [].find but it starts from the end */
function findLast<T>(array: T[], predicate: (value: T) => boolean){
  for(let i = array.length - 1; i >= 0; i--)
    if(predicate(array[i]))
      return array[i]
}
