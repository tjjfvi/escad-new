
import "../stylus/Stats.styl"
import React, { useState } from "react"

export const Stats = () => {
  const [open, setOpen] = useState(false)
  return <div className={"Stats" + (open ? " open" : "")}>
    <span onClick={() => setOpen(!open)}>Stats</span>
    <div className="content">
      <div className="stat"><span>Render Time:</span><span>12ms</span></div>
      <div className="stat"><span>Bounding Box:</span><span>1x1x1</span></div>
      <div className="stat"><span>Faces:</span><span>123</span></div>
    </div>
  </div>
}
