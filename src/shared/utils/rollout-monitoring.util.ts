import { envConfig } from '../../config/getEnvConfig'

/**
 * Rollout monitoring utilities for gradual deployment
 */

export interface RolloutMetrics {
  endpoint: string
  traffic_percentage: number
  request_count: number
  error_count: number
  avg_response_time: number
  timestamp: Date
}

export class RolloutMonitor {
  private static metrics: Map<string, RolloutMetrics> = new Map()

  /**
   * Record metrics for an endpoint
   */
  static recordMetrics(endpoint: string, responseTime: number, hasError = false) {
    const existing = this.metrics.get(endpoint) || {
      endpoint,
      traffic_percentage: this.getTrafficPercentage(endpoint),
      request_count: 0,
      error_count: 0,
      avg_response_time: 0,
      timestamp: new Date()
    }

    existing.request_count++
    if (hasError) existing.error_count++

    // Rolling average for response time
    existing.avg_response_time = (existing.avg_response_time * (existing.request_count - 1) + responseTime) / existing.request_count
    existing.timestamp = new Date()

    this.metrics.set(endpoint, existing)
  }

  /**
   * Get current traffic percentage for an endpoint
   */
  private static getTrafficPercentage(endpoint: string): number {
    // Check environment variables for rollout percentages
    const rolloutFlags: Record<string, keyof typeof envConfig.rollout> = {
      'search_jobs': 'searchJobsPercentage',
      'search_popular': 'searchPopularPercentage',
      'recommendations': 'recommendationsPercentage',
      'matching': 'matchingPercentage'
    }

    const flagName = Object.keys(rolloutFlags).find(key => endpoint.includes(key))
    if (flagName) {
      const configKey = rolloutFlags[flagName]
      return envConfig.rollout[configKey]
    }

    return 0 // Not rolled out
  }

  /**
   * Get all current metrics
   */
  static getAllMetrics(): RolloutMetrics[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Check if rollout should be paused due to high error rates
   */
  static shouldPauseRollout(endpoint: string): boolean {
    const metrics = this.metrics.get(endpoint)
    if (!metrics) return false

    const errorRate = metrics.error_count / metrics.request_count
    const maxErrorRate = envConfig.rollout.maxErrorRate

    return errorRate > maxErrorRate && metrics.request_count > 100 // Minimum sample size
  }

  /**
   * Generate rollout report
   */
  static generateReport(): string {
    const metrics = this.getAllMetrics()
    let report = '=== Rollout Monitoring Report ===\n\n'

    for (const metric of metrics) {
      const errorRate = (metric.error_count / metric.request_count * 100).toFixed(2)
      const shouldPause = this.shouldPauseRollout(metric.endpoint)

      report += `Endpoint: ${metric.endpoint}\n`
      report += `Traffic: ${metric.traffic_percentage}%\n`
      report += `Requests: ${metric.request_count}\n`
      report += `Errors: ${metric.error_count} (${errorRate}%)\n`
      report += `Avg Response Time: ${metric.avg_response_time.toFixed(2)}ms\n`
      report += `Status: ${shouldPause ? '⚠️ HIGH ERROR RATE - CONSIDER PAUSING' : '✅ OK'}\n`
      report += `Last Updated: ${metric.timestamp.toISOString()}\n\n`
    }

    return report
  }
}

/**
 * Middleware to monitor rollout metrics
 */
export const rolloutMetricsMiddleware = (endpointName: string) => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()

    res.on('finish', () => {
      const responseTime = Date.now() - startTime
      const hasError = res.statusCode >= 400

      RolloutMonitor.recordMetrics(endpointName, responseTime, hasError)
    })

    next()
  }
}
