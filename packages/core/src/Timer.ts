
export class Timer {

  #parent?: Timer

  private constructor(){}

  static create(): Timer
  static create<C extends Record<string, Timer | Counter>>(children: C): Timer & C
  static create<C extends Record<string, Timer | Counter>>(children: C | {} = {}): Timer{
    const timer = Object.assign(new Timer(), children)
    for(const value of Object.values(children))
      if(value instanceof Timer)
        value.#parent = timer

    return timer
  }

  actualTime = 0
  totalCount = 0
  totalTime = 0
  averageTime = 0
  averageConcurrency = 0
  #currentActualStart?: number
  #activeCount = 0

  start(now = Date.now()){
    this.#parent?.start(now)
    if(!this.#currentActualStart)
      this.#currentActualStart = now
    this.#activeCount++
    this.totalTime -= now
    this.totalCount++
  }

  end(now = Date.now()){
    this.#parent?.end(now)
    this.totalTime += now
    this.#activeCount--
    if(!this.#activeCount && this.#currentActualStart) {
      this.actualTime += now - this.#currentActualStart
      this.#currentActualStart = undefined
    }
    this.averageTime = this.totalTime / this.totalCount
    this.averageConcurrency = this.totalTime / this.actualTime
    this._update()
  }

  record(){
    const finishParent = this.#parent?.record()
    const start = Date.now()
    const origActualTime = this.actualTime
    const origActualStart = this.#currentActualStart
    return () => {
      finishParent?.()
      const end = Date.now()
      this.totalCount++
      this.totalTime += end - start
      this.actualTime = origActualTime + (this.#currentActualStart ?? end) - (origActualStart ?? start)
      this._update()
    }
  }

  private _update(){
    this.averageTime = this.totalTime / this.totalCount
    this.averageConcurrency = this.totalTime / this.actualTime
  }

  private _timeVal<T>(value: T): T{
    this.end()
    return value
  }

  get timeVal(){
    this.start()
    return this._timeVal
  }

  timeFn<F extends(...args: any[]) => any>(f: F): F & { timer: Timer }{
    return Object.assign(((...args) => {
      this.start()
      let result
      try {
        result = f(...args)
      }
      finally {
        this.end()
      }
      return result
    }) as F, { timer: this })
  }

}

export class Counter {

  private constructor(){ }

  static create(){
    return new Counter()
  }

  value = 0

  increment(){
    this.value++
  }

}
