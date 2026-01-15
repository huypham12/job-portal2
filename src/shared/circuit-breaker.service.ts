/**
 * Circuit Breaker Implementation
 *
 * Pattern: Closed → Open → Half-Open → Closed
 *
 * - Closed: Normal operation, requests pass through
 * - Open: Failures exceeded threshold, reject requests immediately
 * - Half-Open: After timeout, allow limited requests to test recovery
 */

interface CircuitBreakerOptions {
  failureThreshold: number // Number of failures before opening
  successThreshold: number // Number of successes to close from half-open
  timeout: number // Time in ms before attempting half-open
  windowSize: number // Time window in ms for counting failures
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private successCount: number = 0
  private nextAttempt: number = Date.now()
  private failureTimestamps: number[] = []

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker [${this.name}] is OPEN - failing fast`)
        ;(error as any).circuitBreaker = true
        throw error
      }
      // Transition to half-open to test recovery
      this.state = CircuitState.HALF_OPEN
      this.successCount = 0
      console.log(`🔄 Circuit breaker [${this.name}] transitioning to HALF_OPEN`)
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED
        console.log(`✅ Circuit breaker [${this.name}] closed after recovery`)
      }
    }
  }

  private onFailure(): void {
    const now = Date.now()

    // Track failure timestamp
    this.failureTimestamps.push(now)

    // Remove old failures outside the window
    this.failureTimestamps = this.failureTimestamps.filter((timestamp) => now - timestamp < this.options.windowSize)

    // Count failures within window
    const recentFailures = this.failureTimestamps.length

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open immediately opens circuit
      this.open()
    } else if (recentFailures >= this.options.failureThreshold) {
      this.open()
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN
    this.nextAttempt = Date.now() + this.options.timeout
    console.warn(`⚠️ Circuit breaker [${this.name}] OPENED - too many failures`)
  }

  getState(): string {
    return this.state
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureTimestamps.length,
      successCount: this.successCount,
      nextAttempt: this.state === CircuitState.OPEN ? new Date(this.nextAttempt).toISOString() : null
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.failureTimestamps = []
    console.log(`🔄 Circuit breaker [${this.name}] manually reset`)
  }
}

// Circuit breaker registry
const breakers = new Map<string, CircuitBreaker>()

export const circuitBreakerService = {
  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, options: Partial<CircuitBreakerOptions> = {}): CircuitBreaker {
    if (!breakers.has(name)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5, // Open after 5 failures
        successThreshold: 2, // Close after 2 successes
        timeout: 60000, // 1 minute before half-open
        windowSize: 10000, // 10 second window for counting failures
        ...options
      }
      breakers.set(name, new CircuitBreaker(name, defaultOptions))
    }
    return breakers.get(name)!
  },

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(name: string, operation: () => Promise<T>, options?: Partial<CircuitBreakerOptions>): Promise<T> {
    const breaker = this.getBreaker(name, options)
    return breaker.execute(operation)
  },

  /**
   * Check if circuit breaker is open
   */
  isOpen(name: string): boolean {
    const breaker = breakers.get(name)
    return breaker ? breaker.getState() === CircuitState.OPEN : false
  },

  /**
   * Get stats for all circuit breakers
   */
  getAllStats() {
    const stats: Record<string, any> = {}
    breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats()
    })
    return stats
  },

  /**
   * Reset a specific circuit breaker
   */
  reset(name: string): void {
    const breaker = breakers.get(name)
    if (breaker) {
      breaker.reset()
    }
  },

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    breakers.forEach((breaker) => breaker.reset())
  }
}
