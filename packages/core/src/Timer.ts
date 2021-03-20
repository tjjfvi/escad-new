
export class Timer {

  totalTime = 0
  totalCount = 0
  activeCount = 0
  actualTime = 0
  averageTime = 0
  averageConcurrency = 0

  start(){
    if(!this.activeCount)
      this.actualTime -= Date.now()
    this.totalTime -= Date.now()
    this.totalCount++
    this.activeCount++
  }

  end(){
    this.activeCount--
    this.totalTime += Date.now()
    this.averageTime = this.totalTime / this.totalCount
    if(!this.activeCount)
      this.actualTime += Date.now()
    this.averageConcurrency = this.totalTime / this.actualTime
  }

  time<F extends(...args: any[]) => any>(f: F): F{
    return ((...args) => {
      this.start()
      let result
      try {
        result = f(...args)
      }
      catch (e) {
        this.end()
        throw e
      }
      this.end()
      return result
    }) as F
  }

}

export const timers = {
  serialize: new Timer(),
  deserialize: new Timer(),
  hash: new Timer(),
  getProductType: new Timer(),
}
