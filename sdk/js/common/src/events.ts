import { DecisionEvent } from "./types"

export type DecisionObserver = (event: DecisionEvent) => void

export class DecisionEmitter {

  private observer?: DecisionObserver

  setDecisionObserver(observer?: DecisionObserver) {
    this.observer = observer
  }

  hasDecisionObserver(): boolean {
    return !!this.observer
  }
  emit(event: DecisionEvent) {

    if (!this.observer) return

    try {
      this.observer(event)
    } catch {
      // Observability should never break runtime
    }
  }
}


