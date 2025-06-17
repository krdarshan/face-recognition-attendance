/**
 * System Validation and Health Monitoring
 * Real-time system monitoring and validation
 */
class SystemValidator {
  constructor() {
    this.validationInterval = null
    this.healthMetrics = {
      uptime: 0,
      errors: 0,
      warnings: 0,
      performance: {
        avgResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    }
    this.startTime = Date.now()
    this.db = null // Declare db variable
    this.faceEngine = null // Declare faceEngine variable
    this.attendanceSystem = null // Declare attendanceSystem variable
    this.showToast = null // Declare showToast variable
  }

  startMonitoring() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval)
    }

    this.validationInterval = setInterval(() => {
      this.performHealthCheck()
    }, 5000) // Check every 5 seconds

    console.log("🔍 System monitoring started")
  }

  stopMonitoring() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval)
      this.validationInterval = null
    }
    console.log("🔍 System monitoring stopped")
  }

  async performHealthCheck() {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        components: {
          database: await this.checkDatabaseHealth(),
          faceEngine: await this.checkFaceEngineHealth(),
          attendanceSystem: await this.checkAttendanceSystemHealth(),
          userInterface: await this.checkUIHealth(),
          camera: await this.checkCameraHealth(),
        },
        performance: await this.checkPerformance(),
        memory: this.getMemoryInfo(),
      }

      this.updateHealthMetrics(health)
      this.displayHealthStatus(health)

      // Log critical issues
      const criticalIssues = this.findCriticalIssues(health)
      if (criticalIssues.length > 0) {
        await this.db.logActivity("warning", "Critical system issues detected", criticalIssues)
      }

      return health
    } catch (error) {
      console.error("Health check failed:", error)
      await this.db.logActivity("error", "Health check failed", { error: error.message })
    }
  }

  async checkDatabaseHealth() {
    try {
      const startTime = performance.now()
      const users = await this.db.getAllUsers()
      const responseTime = performance.now() - startTime

      return {
        status: "healthy",
        responseTime: responseTime.toFixed(2),
        userCount: users.length,
        initialized: this.db.isInitialized,
      }
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        initialized: false,
      }
    }
  }

  async checkFaceEngineHealth() {
    try {
      const info = this.faceEngine.getSystemInfo()
      const allModelsLoaded = Object.values(info.modelsLoaded).every((loaded) => loaded)

      return {
        status: allModelsLoaded ? "healthy" : "warning",
        initialized: info.isInitialized,
        modelsLoaded: info.modelsLoaded,
        descriptorCount: info.labeledDescriptors,
        thresholds: {
          recognition: info.recognitionThreshold,
          quality: info.qualityThreshold,
        },
      }
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        initialized: false,
      }
    }
  }

  async checkAttendanceSystemHealth() {
    return {
      status: this.attendanceSystem.isActive ? "active" : "inactive",
      active: this.attendanceSystem.isActive,
      hasVideo: !!this.attendanceSystem.videoElement,
      hasCanvas: !!this.attendanceSystem.canvas,
      detectionRunning: !!this.attendanceSystem.detectionInterval,
    }
  }

  async checkUIHealth() {
    const requiredElements = ["mainApp", "videoElement", "overlayCanvas", "attendanceFeed", "userTableBody"]

    const missingElements = requiredElements.filter((id) => !document.getElementById(id))

    return {
      status: missingElements.length === 0 ? "healthy" : "warning",
      missingElements,
      totalElements: requiredElements.length,
      foundElements: requiredElements.length - missingElements.length,
    }
  }

  async checkCameraHealth() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          status: "unsupported",
          error: "Camera API not supported",
        }
      }

      // Check camera permissions without actually accessing camera
      const permissions = await navigator.permissions.query({ name: "camera" })

      return {
        status: permissions.state === "granted" ? "healthy" : "warning",
        permission: permissions.state,
        apiSupported: true,
      }
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        apiSupported: false,
      }
    }
  }

  async checkPerformance() {
    const performanceEntries = performance.getEntriesByType("navigation")
    const navigationEntry = performanceEntries[0]

    return {
      loadTime: navigationEntry ? navigationEntry.loadEventEnd - navigationEntry.loadEventStart : 0,
      domContentLoaded: navigationEntry
        ? navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart
        : 0,
      timeOrigin: performance.timeOrigin,
      now: performance.now(),
    }
  }

  getMemoryInfo() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
        percentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100),
      }
    }
    return {
      used: 0,
      total: 0,
      limit: 0,
      percentage: 0,
      unavailable: true,
    }
  }

  updateHealthMetrics(health) {
    this.healthMetrics.uptime = health.uptime

    // Count errors and warnings
    Object.values(health.components).forEach((component) => {
      if (component.status === "error") {
        this.healthMetrics.errors++
      } else if (component.status === "warning") {
        this.healthMetrics.warnings++
      }
    })

    // Update performance metrics
    if (health.components.database.responseTime) {
      this.healthMetrics.performance.avgResponseTime = Number.parseFloat(health.components.database.responseTime)
    }

    if (health.memory.used) {
      this.healthMetrics.performance.memoryUsage = health.memory.used
    }
  }

  displayHealthStatus(health) {
    // Update system status indicator
    const statusText = document.getElementById("statusText")
    const statusDot = document.querySelector(".status-dot")

    if (statusText && statusDot) {
      const overallHealth = this.calculateOverallHealth(health)

      if (overallHealth >= 0.8) {
        statusText.textContent = "System Healthy"
        statusDot.className = "status-dot active"
      } else if (overallHealth >= 0.6) {
        statusText.textContent = "System Warning"
        statusDot.className = "status-dot warning"
      } else {
        statusText.textContent = "System Error"
        statusDot.className = "status-dot error"
      }
    }

    // Update performance indicator if exists
    this.updatePerformanceIndicator(health)
  }

  calculateOverallHealth(health) {
    const components = health.components
    let healthyCount = 0
    let totalCount = 0

    Object.values(components).forEach((component) => {
      totalCount++
      if (component.status === "healthy" || component.status === "active") {
        healthyCount++
      }
    })

    return totalCount > 0 ? healthyCount / totalCount : 0
  }

  updatePerformanceIndicator(health) {
    let indicator = document.querySelector(".performance-indicator")

    if (!indicator) {
      indicator = document.createElement("div")
      indicator.className = "performance-indicator"
      document.body.appendChild(indicator)
    }

    const memInfo = health.memory
    const uptime = Math.round(health.uptime / 1000)

    indicator.innerHTML = `
      <div>Uptime: ${uptime}s</div>
      <div>Memory: ${memInfo.used}MB/${memInfo.total}MB (${memInfo.percentage}%)</div>
      <div>DB Response: ${health.components.database.responseTime || "N/A"}ms</div>
      <div>Users: ${health.components.database.userCount || 0}</div>
    `

    // Show/hide based on system preference
    if (localStorage.getItem("showPerformanceIndicator") === "true") {
      indicator.classList.add("show")
    }
  }

  findCriticalIssues(health) {
    const issues = []

    // Check for critical component failures
    Object.entries(health.components).forEach(([name, component]) => {
      if (component.status === "error") {
        issues.push({
          component: name,
          severity: "critical",
          message: component.error || "Component failure",
          timestamp: health.timestamp,
        })
      }
    })

    // Check memory usage
    if (health.memory.percentage > 90) {
      issues.push({
        component: "memory",
        severity: "warning",
        message: `High memory usage: ${health.memory.percentage}%`,
        timestamp: health.timestamp,
      })
    }

    // Check database response time
    if (health.components.database.responseTime > 1000) {
      issues.push({
        component: "database",
        severity: "warning",
        message: `Slow database response: ${health.components.database.responseTime}ms`,
        timestamp: health.timestamp,
      })
    }

    return issues
  }

  async runComprehensiveValidation() {
    console.log("🔍 Running comprehensive system validation...")

    const validationResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    }

    // Test 1: Database Integrity
    await this.validateTest(validationResults, "Database Integrity", async () => {
      const users = await this.db.getAllUsers()
      const attendance = await this.db.getAttendanceRecords()
      const descriptors = await this.db.getFaceDescriptors()

      // Check data consistency
      const userIds = users.map((u) => u.id)
      const attendanceUserIds = [...new Set(attendance.map((a) => a.userId))]
      const descriptorUserIds = [...new Set(descriptors.map((d) => d.userId))]

      const orphanedAttendance = attendanceUserIds.filter((id) => !userIds.includes(id))
      const orphanedDescriptors = descriptorUserIds.filter((id) => !userIds.includes(id))

      if (orphanedAttendance.length > 0 || orphanedDescriptors.length > 0) {
        throw new Error(
          `Data integrity issues: ${orphanedAttendance.length} orphaned attendance records, ${orphanedDescriptors.length} orphaned descriptors`,
        )
      }

      return true
    })

    // Test 2: Face Engine Model Validation
    await this.validateTest(validationResults, "Face Engine Models", async () => {
      const info = this.faceEngine.getSystemInfo()
      const requiredModels = ["ssdMobilenetv1", "faceLandmark68Net", "faceRecognitionNet", "faceExpressionNet"]

      const missingModels = requiredModels.filter((model) => !info.modelsLoaded[model])

      if (missingModels.length > 0) {
        throw new Error(`Missing models: ${missingModels.join(", ")}`)
      }

      return true
    })

    // Test 3: UI Component Validation
    await this.validateTest(validationResults, "UI Components", async () => {
      const requiredElements = [
        "mainApp",
        "videoElement",
        "overlayCanvas",
        "attendanceFeed",
        "userTableBody",
        "enrollmentVideo",
        "enrollmentCanvas",
      ]

      const missingElements = requiredElements.filter((id) => !document.getElementById(id))

      if (missingElements.length > 0) {
        throw new Error(`Missing UI elements: ${missingElements.join(", ")}`)
      }

      return true
    })

    // Test 4: Browser Compatibility
    await this.validateTest(validationResults, "Browser Compatibility", async () => {
      const requiredAPIs = ["navigator.mediaDevices", "indexedDB", "performance", "WebAssembly"]

      const missingAPIs = requiredAPIs.filter((api) => {
        const parts = api.split(".")
        let obj = window
        for (const part of parts) {
          if (!obj[part]) return true
          obj = obj[part]
        }
        return false
      })

      if (missingAPIs.length > 0) {
        throw new Error(`Missing browser APIs: ${missingAPIs.join(", ")}`)
      }

      return true
    })

    // Test 5: Performance Benchmarks
    await this.validateTest(validationResults, "Performance Benchmarks", async () => {
      const startTime = performance.now()

      // Run multiple database operations
      await Promise.all([this.db.getAllUsers(), this.db.getAttendanceRecords(), this.db.getFaceDescriptors()])

      const endTime = performance.now()
      const totalTime = endTime - startTime

      if (totalTime > 2000) {
        throw new Error(`Performance below threshold: ${totalTime.toFixed(2)}ms (max: 2000ms)`)
      }

      return true
    })

    // Test 6: Security Validation
    await this.validateTest(validationResults, "Security Validation", async () => {
      // Check for secure contexts
      if (location.protocol !== "https:" && location.hostname !== "localhost") {
        throw new Error("Application should run over HTTPS in production")
      }

      // Check for XSS vulnerabilities in user data
      const users = await this.db.getAllUsers()
      const dangerousPatterns = /<script|javascript:|on\w+=/i

      const vulnerableUsers = users.filter(
        (user) =>
          dangerousPatterns.test(user.name) ||
          dangerousPatterns.test(user.email) ||
          dangerousPatterns.test(user.department),
      )

      if (vulnerableUsers.length > 0) {
        throw new Error(`Potential XSS vulnerabilities in user data: ${vulnerableUsers.length} users`)
      }

      return true
    })

    // Generate final report
    this.generateValidationReport(validationResults)

    return validationResults
  }

  async validateTest(results, testName, testFunction) {
    const test = {
      name: testName,
      startTime: performance.now(),
      status: "running",
    }

    try {
      const result = await testFunction()
      test.endTime = performance.now()
      test.duration = test.endTime - test.startTime
      test.status = result ? "passed" : "failed"
      test.result = result

      if (test.status === "passed") {
        results.summary.passed++
      } else {
        results.summary.failed++
      }
    } catch (error) {
      test.endTime = performance.now()
      test.duration = test.endTime - test.startTime
      test.status = "failed"
      test.error = error.message
      results.summary.failed++
    }

    results.tests.push(test)
    results.summary.total++

    const status = test.status === "passed" ? "✅" : "❌"
    console.log(`${status} ${testName} (${test.duration.toFixed(2)}ms)`)
  }

  generateValidationReport(results) {
    const successRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1)

    console.log("\n📋 VALIDATION REPORT")
    console.log("====================")
    console.log(`Timestamp: ${results.timestamp}`)
    console.log(`Total Tests: ${results.summary.total}`)
    console.log(`Passed: ${results.summary.passed}`)
    console.log(`Failed: ${results.summary.failed}`)
    console.log(`Success Rate: ${successRate}%`)

    if (results.summary.failed > 0) {
      console.log("\n❌ Failed Tests:")
      results.tests
        .filter((test) => test.status === "failed")
        .forEach((test) => {
          console.log(`- ${test.name}: ${test.error || "Unknown error"}`)
        })
    }

    // Log to database
    this.db.logActivity("info", "System validation completed", {
      summary: results.summary,
      successRate: Number.parseFloat(successRate),
      failedTests: results.tests.filter((test) => test.status === "failed").map((test) => test.name),
    })
  }

  async exportValidationReport() {
    try {
      const health = await this.performHealthCheck()
      const validation = await this.runComprehensiveValidation()

      const report = {
        exportDate: new Date().toISOString(),
        systemInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        },
        healthCheck: health,
        validation: validation,
        metrics: this.healthMetrics,
      }

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `system-validation-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.showToast("Validation report exported successfully", "success")
    } catch (error) {
      console.error("Export validation report error:", error)
      this.showToast("Failed to export validation report", "error")
    }
  }

  // Utility methods for debugging
  togglePerformanceIndicator() {
    const current = localStorage.getItem("showPerformanceIndicator") === "true"
    localStorage.setItem("showPerformanceIndicator", (!current).toString())

    const indicator = document.querySelector(".performance-indicator")
    if (indicator) {
      indicator.classList.toggle("show", !current)
    }
  }

  getSystemDiagnostics() {
    return {
      validator: {
        monitoring: !!this.validationInterval,
        startTime: this.startTime,
        metrics: this.healthMetrics,
      },
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      performance: this.getMemoryInfo(),
      timestamp: new Date().toISOString(),
    }
  }
}

// Global validator instance
const systemValidator = new SystemValidator()

// Assign variables for global access
systemValidator.db = window.db // Assign db variable
systemValidator.faceEngine = window.faceEngine // Assign faceEngine variable
systemValidator.attendanceSystem = window.attendanceSystem // Assign attendanceSystem variable
systemValidator.showToast = window.showToast // Assign showToast variable

// Global functions for console access
window.startSystemMonitoring = () => systemValidator.startMonitoring()
window.stopSystemMonitoring = () => systemValidator.stopMonitoring()
window.runSystemValidation = () => systemValidator.runComprehensiveValidation()
window.exportValidationReport = () => systemValidator.exportValidationReport()
window.togglePerformanceIndicator = () => systemValidator.togglePerformanceIndicator()
window.getSystemDiagnostics = () => systemValidator.getSystemDiagnostics()

// Auto-start monitoring when system is ready
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    systemValidator.startMonitoring()
  }, 3000) // Start monitoring 3 seconds after DOM load
})
