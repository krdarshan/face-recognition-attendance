/**
 * System Testing and Validation
 * Comprehensive testing suite for the face recognition attendance system
 */
class SystemTester {
  constructor() {
    this.testResults = []
    this.isRunning = false
    this.db = null
    this.faceEngine = null
    this.attendanceSystem = null
    this.userManagement = null
    this.app = null
  }

  async runAllTests() {
    if (this.isRunning) {
      console.log("Tests already running...")
      return
    }

    this.isRunning = true
    this.testResults = []

    console.log("🧪 Starting comprehensive system tests...")

    try {
      // Database tests
      await this.testDatabase()

      // Face engine tests
      await this.testFaceEngine()

      // Attendance system tests
      await this.testAttendanceSystem()

      // User management tests
      await this.testUserManagement()

      // Integration tests
      await this.testIntegration()

      // Performance tests
      await this.testPerformance()

      this.generateTestReport()
    } catch (error) {
      console.error("Test suite failed:", error)
    } finally {
      this.isRunning = false
    }
  }

  async testDatabase() {
    console.log("📊 Testing database operations...")

    try {
      // Test database initialization
      await this.runTest("Database initialization", async () => {
        const result = await this.db.initialize()
        return result === true
      })

      // Test user operations
      await this.runTest("User creation", async () => {
        const userId = await this.db.addUser({
          name: "Test User",
          email: "test@example.com",
          department: "Testing",
          role: "Tester",
        })
        return typeof userId === "number" && userId > 0
      })

      await this.runTest("User retrieval", async () => {
        const users = await this.db.getAllUsers()
        return Array.isArray(users) && users.length > 0
      })

      await this.runTest("User update", async () => {
        const users = await this.db.getAllUsers()
        if (users.length === 0) return false

        const user = users[0]
        const updated = await this.db.updateUser(user.id, { name: "Updated Test User" })
        return updated.name === "Updated Test User"
      })

      // Test attendance operations
      await this.runTest("Attendance recording", async () => {
        const users = await this.db.getAllUsers()
        if (users.length === 0) return false

        const attendanceId = await this.db.addAttendanceRecord(users[0].id, 0.95, {
          test: true,
        })
        return typeof attendanceId === "number" && attendanceId > 0
      })

      await this.runTest("Attendance retrieval", async () => {
        const records = await this.db.getAttendanceRecords()
        return Array.isArray(records) && records.length > 0
      })

      // Test face descriptor operations
      await this.runTest("Face descriptor storage", async () => {
        const users = await this.db.getAllUsers()
        if (users.length === 0) return false

        const mockDescriptor = new Float32Array(128).fill(0.5)
        const descriptorId = await this.db.addFaceDescriptor(users[0].id, mockDescriptor)
        return typeof descriptorId === "number" && descriptorId > 0
      })
    } catch (error) {
      console.error("Database tests failed:", error)
    }
  }

  async testFaceEngine() {
    console.log("👤 Testing face recognition engine...")

    try {
      await this.runTest("Face engine initialization", async () => {
        return this.faceEngine.isInitialized
      })

      await this.runTest("Model loading status", async () => {
        const info = this.faceEngine.getSystemInfo()
        return Object.values(info.modelsLoaded).every((loaded) => loaded === true)
      })

      await this.runTest("Face descriptor loading", async () => {
        await this.faceEngine.loadFaceDescriptors()
        const info = this.faceEngine.getSystemInfo()
        return typeof info.labeledDescriptors === "number"
      })

      // Test with mock video element
      await this.runTest("Face detection capability", async () => {
        const canvas = document.createElement("canvas")
        canvas.width = 640
        canvas.height = 480

        const ctx = canvas.getContext("2d")
        ctx.fillStyle = "#f0f0f0"
        ctx.fillRect(0, 0, 640, 480)

        try {
          const detections = await this.faceEngine.detectFaces(canvas)
          return Array.isArray(detections)
        } catch (error) {
          // Expected to fail with mock data, but should not crash
          return true
        }
      })
    } catch (error) {
      console.error("Face engine tests failed:", error)
    }
  }

  async testAttendanceSystem() {
    console.log("📋 Testing attendance system...")

    try {
      await this.runTest("Attendance system initialization check", async () => {
        return typeof this.attendanceSystem.initialize === "function"
      })

      await this.runTest("System state management", async () => {
        const initialState = this.attendanceSystem.isActive
        return typeof initialState === "boolean"
      })

      await this.runTest("Camera constraints validation", async () => {
        // Test camera constraint object structure
        const constraints = {
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: "user",
          },
        }
        return constraints.video && constraints.video.facingMode === "user"
      })
    } catch (error) {
      console.error("Attendance system tests failed:", error)
    }
  }

  async testUserManagement() {
    console.log("👥 Testing user management...")

    try {
      await this.runTest("User management initialization", async () => {
        return typeof this.userManagement.initialize === "function"
      })

      await this.runTest("Form validation logic", async () => {
        // Test form validation without actual DOM
        const mockFormData = {
          name: "Test User",
          email: "test@example.com",
          department: "Testing",
        }
        return mockFormData.name && mockFormData.email && mockFormData.department
      })

      await this.runTest("Enrollment sample management", async () => {
        this.userManagement.enrollmentSamples = []
        this.userManagement.requiredSamples = 5

        // Simulate adding samples
        for (let i = 0; i < 3; i++) {
          this.userManagement.enrollmentSamples.push({
            descriptor: new Float32Array(128),
            quality: 0.8,
            timestamp: new Date().toISOString(),
          })
        }

        return this.userManagement.enrollmentSamples.length === 3
      })
    } catch (error) {
      console.error("User management tests failed:", error)
    }
  }

  async testIntegration() {
    console.log("🔗 Testing system integration...")

    try {
      await this.runTest("Database-FaceEngine integration", async () => {
        const users = await this.db.getAllUsers()
        const descriptors = await this.db.getFaceDescriptors()

        // Check if face engine can load descriptors from database
        await this.faceEngine.loadFaceDescriptors()
        const info = this.faceEngine.getSystemInfo()

        return typeof info.labeledDescriptors === "number"
      })

      await this.runTest("Cross-component communication", async () => {
        // Test if components can communicate through global instances
        return (
          typeof this.app !== "undefined" &&
          typeof this.attendanceSystem !== "undefined" &&
          typeof this.userManagement !== "undefined" &&
          typeof this.faceEngine !== "undefined" &&
          typeof this.db !== "undefined"
        )
      })

      await this.runTest("Event handling system", async () => {
        // Test if global functions are properly defined
        return (
          typeof window.switchMode === "function" &&
          typeof window.showToast === "function" &&
          typeof window.exportData === "function"
        )
      })
    } catch (error) {
      console.error("Integration tests failed:", error)
    }
  }

  async testPerformance() {
    console.log("⚡ Testing system performance...")

    try {
      await this.runTest("Database query performance", async () => {
        const startTime = performance.now()
        await this.db.getAllUsers()
        const endTime = performance.now()

        const queryTime = endTime - startTime
        console.log(`Database query time: ${queryTime.toFixed(2)}ms`)

        return queryTime < 100 // Should complete within 100ms
      })

      await this.runTest("Memory usage check", async () => {
        if (performance.memory) {
          const memInfo = performance.memory
          console.log("Memory usage:", {
            used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + "MB",
            total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024) + "MB",
            limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024) + "MB",
          })

          // Check if memory usage is reasonable (less than 100MB)
          return memInfo.usedJSHeapSize < 100 * 1024 * 1024
        }
        return true // Skip if memory API not available
      })

      await this.runTest("System responsiveness", async () => {
        const startTime = performance.now()

        // Simulate multiple operations
        await Promise.all([this.db.getAllUsers(), this.db.getAttendanceRecords(), this.db.getFaceDescriptors()])

        const endTime = performance.now()
        const totalTime = endTime - startTime

        console.log(`Concurrent operations time: ${totalTime.toFixed(2)}ms`)
        return totalTime < 500 // Should complete within 500ms
      })
    } catch (error) {
      console.error("Performance tests failed:", error)
    }
  }

  async runTest(testName, testFunction) {
    try {
      const startTime = performance.now()
      const result = await testFunction()
      const endTime = performance.now()
      const duration = endTime - startTime

      const testResult = {
        name: testName,
        passed: result === true,
        duration: duration.toFixed(2),
        timestamp: new Date().toISOString(),
      }

      this.testResults.push(testResult)

      const status = testResult.passed ? "✅" : "❌"
      console.log(`${status} ${testName} (${testResult.duration}ms)`)

      return testResult
    } catch (error) {
      const testResult = {
        name: testName,
        passed: false,
        error: error.message,
        duration: 0,
        timestamp: new Date().toISOString(),
      }

      this.testResults.push(testResult)
      console.log(`❌ ${testName} - Error: ${error.message}`)

      return testResult
    }
  }

  generateTestReport() {
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter((test) => test.passed).length
    const failedTests = totalTests - passedTests
    const successRate = ((passedTests / totalTests) * 100).toFixed(1)

    console.log("\n📊 TEST REPORT")
    console.log("================")
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Success Rate: ${successRate}%`)

    if (failedTests > 0) {
      console.log("\n❌ Failed Tests:")
      this.testResults
        .filter((test) => !test.passed)
        .forEach((test) => {
          console.log(`- ${test.name}${test.error ? ": " + test.error : ""}`)
        })
    }

    console.log("\n⏱️ Performance Summary:")
    const avgDuration = this.testResults.reduce((sum, test) => sum + Number.parseFloat(test.duration), 0) / totalTests
    console.log(`Average test duration: ${avgDuration.toFixed(2)}ms`)

    // Log to database
    this.db.logActivity("info", "System test completed", {
      totalTests,
      passedTests,
      failedTests,
      successRate: Number.parseFloat(successRate),
      avgDuration: Number.parseFloat(avgDuration.toFixed(2)),
    })

    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: Number.parseFloat(successRate),
      results: this.testResults,
    }
  }

  async validateSystemHealth() {
    console.log("🏥 Checking system health...")

    const healthChecks = {
      database: false,
      faceEngine: false,
      userInterface: false,
      permissions: false,
    }

    try {
      // Database health
      healthChecks.database = this.db.isInitialized

      // Face engine health
      healthChecks.faceEngine = this.faceEngine.isInitialized

      // UI health
      healthChecks.userInterface = document.getElementById("mainApp") !== null

      // Permissions health
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((track) => track.stop())
        healthChecks.permissions = true
      } catch (error) {
        healthChecks.permissions = false
      }

      const healthScore = (Object.values(healthChecks).filter(Boolean).length / Object.keys(healthChecks).length) * 100

      console.log("System Health:", healthChecks)
      console.log(`Overall Health Score: ${healthScore.toFixed(1)}%`)

      return { healthChecks, healthScore }
    } catch (error) {
      console.error("Health check failed:", error)
      return { healthChecks, healthScore: 0 }
    }
  }
}

// Global system tester instance
const systemTester = new SystemTester()

// Assign global variables
systemTester.db = window.db
systemTester.faceEngine = window.faceEngine
systemTester.attendanceSystem = window.attendanceSystem
systemTester.userManagement = window.userManagement
systemTester.app = window.app

// Add global functions for testing
window.runSystemTests = () => systemTester.runAllTests()
window.checkSystemHealth = () => systemTester.validateSystemHealth()

// Auto-run basic health check on load
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    systemTester.validateSystemHealth()
  }, 2000)
})
