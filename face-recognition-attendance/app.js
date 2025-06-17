/**
 * Main Application Controller
 * Orchestrates all system components and handles UI interactions
 */
class FaceAttendanceApp {
  constructor() {
    this.isInitialized = false
    this.currentMode = "attendance"
    this.systemHealth = {
      database: false,
      faceEngine: false,
      camera: false,
      attendance: false,
    }
    this.db = null // Declare db variable
    this.faceEngine = null // Declare faceEngine variable
    this.userManagement = null // Declare userManagement variable
    this.attendanceSystem = null // Declare attendanceSystem variable
  }

  async initialize() {
    try {
      await this.showLoadingScreen()

      // Initialize database
      await this.initializeDatabase()

      // Initialize face recognition engine
      await this.initializeFaceEngine()

      // Initialize user management
      await this.initializeUserManagement()

      // Setup event listeners
      this.setupEventListeners()

      // Hide loading screen and show main app
      await this.hideLoadingScreen()

      this.isInitialized = true
      await this.db.logActivity("info", "Application initialized successfully")

      window.showToast('System ready! Click "Initialize System" to start.', "success")
    } catch (error) {
      console.error("Application initialization failed:", error)
      await this.showError("System Initialization Failed", error.message, error)
    }
  }

  async showLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen")
    const mainApp = document.getElementById("mainApp")

    if (loadingScreen) loadingScreen.classList.remove("hidden")
    if (mainApp) mainApp.classList.add("hidden")
  }

  async hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen")
    const mainApp = document.getElementById("mainApp")

    if (loadingScreen) {
      loadingScreen.style.opacity = "0"
      setTimeout(() => {
        loadingScreen.classList.add("hidden")
        if (mainApp) mainApp.classList.remove("hidden")
      }, 500)
    }
  }

  async initializeDatabase() {
    try {
      this.updateLoadingProgress(10, "Initializing database...")
      await this.db.initialize()
      this.systemHealth.database = true
      this.updateLoadingProgress(25, "Database ready")
    } catch (error) {
      throw new Error(`Database initialization failed: ${error.message}`)
    }
  }

  async initializeFaceEngine() {
    try {
      await this.faceEngine.initialize((progress, status) => {
        this.updateLoadingProgress(25 + progress * 0.5, status)
      })
      this.systemHealth.faceEngine = true
    } catch (error) {
      throw new Error(`Face engine initialization failed: ${error.message}`)
    }
  }

  async initializeUserManagement() {
    try {
      this.updateLoadingProgress(85, "Setting up user management...")
      await this.userManagement.initialize()
      this.updateLoadingProgress(95, "User management ready")
    } catch (error) {
      throw new Error(`User management initialization failed: ${error.message}`)
    }
  }

  updateLoadingProgress(percentage, status) {
    const progressFill = document.getElementById("progressFill")
    const loadingStatus = document.getElementById("loadingStatus")

    if (progressFill) {
      progressFill.style.width = `${percentage}%`
    }

    if (loadingStatus) {
      loadingStatus.textContent = status
    }
  }

  setupEventListeners() {
    // System control buttons
    const startBtn = document.getElementById("startSystemBtn")
    const captureBtn = document.getElementById("captureBtn")
    const stopBtn = document.getElementById("stopSystemBtn")

    if (startBtn) startBtn.onclick = () => this.initializeSystem()
    if (captureBtn) captureBtn.onclick = () => this.captureAttendance()
    if (stopBtn) stopBtn.onclick = () => this.stopSystem()

    // Window events
    window.addEventListener("beforeunload", () => this.cleanup())
    window.addEventListener("error", (event) => this.handleGlobalError(event))

    // Visibility change handling
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseSystem()
      } else {
        this.resumeSystem()
      }
    })

    // Keyboard shortcuts
    document.addEventListener("keydown", (event) => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return

      switch (event.key.toLowerCase()) {
        case "i":
          if (!this.attendanceSystem.isActive) this.initializeSystem()
          break
        case "c":
          if (this.attendanceSystem.isActive) this.captureAttendance()
          break
        case "s":
          if (this.attendanceSystem.isActive) this.stopSystem()
          break
      }
    })
  }

  async initializeSystem() {
    try {
      if (!this.isInitialized) {
        window.showToast("Please wait for system initialization to complete", "warning")
        return
      }

      window.showToast("Starting attendance system...", "info")

      await this.attendanceSystem.initialize()
      this.systemHealth.attendance = true

      this.updateButtonStates()
      window.showToast("Attendance system is now active!", "success")
    } catch (error) {
      console.error("System start error:", error)
      await this.showError("System Start Failed", error.message, error)
    }
  }

  async captureAttendance() {
    try {
      const success = await this.attendanceSystem.captureAttendance()
      if (success) {
        await this.userManagement.updateStats()
      }
    } catch (error) {
      console.error("Attendance capture error:", error)
      window.showToast("Attendance capture failed", "error")
    }
  }

  async stopSystem() {
    try {
      await this.attendanceSystem.stop()
      this.systemHealth.attendance = false
      this.updateButtonStates()
      window.showToast("Attendance system stopped", "info")
    } catch (error) {
      console.error("System stop error:", error)
      window.showToast("Error stopping system", "error")
    }
  }

  updateButtonStates() {
    const startBtn = document.getElementById("startSystemBtn")
    const captureBtn = document.getElementById("captureBtn")
    const stopBtn = document.getElementById("stopSystemBtn")

    const isActive = this.attendanceSystem.isActive

    if (startBtn) startBtn.disabled = isActive
    if (captureBtn) captureBtn.disabled = !isActive
    if (stopBtn) stopBtn.disabled = !isActive
  }

  pauseSystem() {
    if (this.attendanceSystem.isActive) {
      // Pause detection but keep camera active
      if (this.attendanceSystem.detectionInterval) {
        clearInterval(this.attendanceSystem.detectionInterval)
      }
    }
  }

  resumeSystem() {
    if (this.attendanceSystem.isActive) {
      // Resume detection
      this.attendanceSystem.startDetectionLoop()
    }
  }

  async cleanup() {
    try {
      if (this.attendanceSystem.isActive) {
        await this.attendanceSystem.stop()
      }

      if (this.userManagement.isEnrolling) {
        this.userManagement.stopEnrollment()
      }

      await this.db.logActivity("info", "Application cleanup completed")
    } catch (error) {
      console.error("Cleanup error:", error)
    }
  }

  handleGlobalError(event) {
    console.error("Global error:", event.error)
    this.showError("Unexpected Error", event.error?.message || "An unexpected error occurred", event.error)
  }

  async showError(title, message, error = null) {
    const modal = document.getElementById("errorModal")
    const errorMessage = document.getElementById("errorMessage")
    const errorDetails = document.getElementById("errorDetails")

    if (modal && errorMessage) {
      errorMessage.textContent = message

      if (error && errorDetails) {
        errorDetails.textContent = JSON.stringify(
          {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        )
      }

      modal.classList.remove("hidden")

      // Log error
      await this.db.logActivity("error", `${title}: ${message}`, {
        error: error?.message,
        stack: error?.stack,
      })
    }

    window.showToast(message, "error")
  }

  async exportData() {
    try {
      const data = await this.db.exportData()

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `attendance-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      window.showToast("Data exported successfully", "success")
    } catch (error) {
      console.error("Export error:", error)
      window.showToast("Failed to export data", "error")
    }
  }

  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      health: this.systemHealth,
      mode: this.currentMode,
      faceEngine: this.faceEngine.getSystemInfo(),
      timestamp: new Date().toISOString(),
    }
  }
}

// Global functions for HTML onclick handlers
window.switchMode = (mode) => {
  const modes = ["attendance", "enrollment", "management"]
  const currentMode = window.app.currentMode

  if (!modes.includes(mode)) return

  // Hide all modes
  modes.forEach((m) => {
    const element = document.getElementById(`${m}Mode`)
    const tab = document.getElementById(`${m}Tab`)

    if (element) element.classList.add("hidden")
    if (tab) tab.classList.remove("active")
  })

  // Show selected mode
  const selectedMode = document.getElementById(`${mode}Mode`)
  const selectedTab = document.getElementById(`${mode}Tab`)

  if (selectedMode) selectedMode.classList.remove("hidden")
  if (selectedTab) selectedTab.classList.add("active")

  window.app.currentMode = mode

  // Mode-specific initialization
  if (mode === "management" && currentMode !== "management") {
    window.app.userManagement.loadUserTable()
    window.app.userManagement.updateStats()
  }
}

window.closeErrorModal = () => {
  const modal = document.getElementById("errorModal")
  if (modal) modal.classList.add("hidden")
}

window.toggleErrorDetails = () => {
  const details = document.getElementById("errorDetails")
  if (details) {
    details.classList.toggle("hidden")
  }
}

window.retryOperation = () => {
  window.closeErrorModal()
  // Implement retry logic based on current operation
  if (!window.app.isInitialized) {
    window.app.initialize()
  }
}

window.exportData = () => window.app.exportData()

// Toast notification system
window.showToast = (message, type = "info") => {
  const container = document.getElementById("toastContainer")
  if (!container) return

  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `

  container.appendChild(toast)

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (container.contains(toast)) {
      toast.style.animation = "slideInRight 0.3s ease-out reverse"
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast)
        }
      }, 300)
    }
  }, 4000)
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  window.app = new FaceAttendanceApp()
  window.app.db = window.db // Assign db variable
  window.app.faceEngine = window.faceEngine // Assign faceEngine variable
  window.app.userManagement = window.userManagement // Assign userManagement variable
  window.app.attendanceSystem = window.attendanceSystem // Assign attendanceSystem variable
  await window.app.initialize()
})

// Global app instance
let app
