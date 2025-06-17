/**
 * Attendance System Core Logic
 * Handles all attendance-related operations
 */
class AttendanceSystem {
  constructor(db, faceEngine, showToast) {
    this.isActive = false
    this.videoElement = null
    this.canvas = null
    this.stream = null
    this.detectionInterval = null
    this.currentDetections = []
    this.lastRecognitionTime = 0
    this.recognitionCooldown = 3000 // 3 seconds between recognitions
    this.db = db
    this.faceEngine = faceEngine
    this.showToast = showToast
  }

  async initialize() {
    try {
      // Get DOM elements
      this.videoElement = document.getElementById("videoElement")
      this.canvas = document.getElementById("overlayCanvas")

      if (!this.videoElement || !this.canvas) {
        throw new Error("Required DOM elements not found")
      }

      // Initialize camera
      await this.startCamera()

      // Start detection loop
      this.startDetectionLoop()

      this.isActive = true
      await this.db.logActivity("info", "Attendance system initialized")

      return true
    } catch (error) {
      await this.db.logActivity("error", `Attendance system initialization failed: ${error.message}`)
      throw error
    }
  }

  async startCamera() {
    try {
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 60 },
        },
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.videoElement.srcObject = this.stream

      return new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.canvas.width = this.videoElement.videoWidth
          this.canvas.height = this.videoElement.videoHeight
          resolve()
        }
        this.videoElement.onerror = reject
      })
    } catch (error) {
      throw new Error(`Camera initialization failed: ${error.message}`)
    }
  }

  startDetectionLoop() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
    }

    this.detectionInterval = setInterval(async () => {
      if (!this.isActive || !this.faceEngine.isInitialized) return

      try {
        await this.detectAndDisplayFaces()
      } catch (error) {
        console.error("Detection loop error:", error)
      }
    }, 100) // 10 FPS detection rate
  }

  async detectAndDisplayFaces() {
    if (!this.videoElement.videoWidth || !this.videoElement.videoHeight) return

    try {
      // Detect faces
      const detections = await this.faceEngine.detectFaces(this.videoElement, {
        minQuality: 0.3,
      })

      this.currentDetections = detections

      // Update UI
      this.updateFaceCount(detections.length)
      this.updateQualityDisplay(detections)

      // Draw detections on canvas
      this.faceEngine.drawDetections(this.canvas, detections, {
        showQuality: true,
        showLandmarks: false,
      })

      // Update system status
      if (detections.length > 0) {
        this.updateSystemStatus("Faces detected", "active")
      } else {
        this.updateSystemStatus("No faces detected", "scanning")
      }
    } catch (error) {
      console.error("Face detection error:", error)
      this.updateSystemStatus("Detection error", "error")
    }
  }

  async captureAttendance() {
    if (!this.isActive || this.currentDetections.length === 0) {
      this.showToast("No faces detected. Please position yourself in front of the camera.", "warning")
      return false
    }

    // Check cooldown
    const now = Date.now()
    if (now - this.lastRecognitionTime < this.recognitionCooldown) {
      const remaining = Math.ceil((this.recognitionCooldown - (now - this.lastRecognitionTime)) / 1000)
      this.showToast(`Please wait ${remaining} seconds before next attempt.`, "info")
      return false
    }

    try {
      this.updateSystemStatus("Processing attendance...", "scanning")

      // Recognize faces
      const users = await this.db.getAllUsers()
      const recognitionResults = await this.faceEngine.recognizeFaces(this.currentDetections)

      if (recognitionResults.length === 0) {
        this.showToast("No faces could be processed. Please try again.", "error")
        return false
      }

      // Find best match
      const bestMatch = recognitionResults
        .filter((result) => result.isMatch && result.confidence >= this.faceEngine.recognitionThreshold)
        .sort((a, b) => b.confidence - a.confidence)[0]

      if (bestMatch) {
        // Record attendance
        const attendanceId = await this.db.addAttendanceRecord(bestMatch.userId, bestMatch.confidence, {
          quality: bestMatch.quality,
          detectionCount: recognitionResults.length,
          timestamp: new Date().toISOString(),
        })

        const user = users.find((u) => u.id === bestMatch.userId)

        // Show success result
        this.showRecognitionResult(user, bestMatch, true)

        // Update attendance feed
        this.updateAttendanceFeed(user)

        this.showToast(`Welcome back, ${user.name}! Attendance recorded.`, "success")

        this.lastRecognitionTime = now
        return true
      } else {
        // No match found
        this.showRecognitionResult(null, recognitionResults[0], false)
        this.showToast("Face not recognized. Please ensure you are enrolled in the system.", "error")
        return false
      }
    } catch (error) {
      console.error("Attendance capture error:", error)
      await this.db.logActivity("error", `Attendance capture failed: ${error.message}`)
      this.showToast("Attendance capture failed. Please try again.", "error")
      this.updateSystemStatus("Capture failed", "error")
      return false
    }
  }

  showRecognitionResult(user, result, isSuccess) {
    const resultsSection = document.getElementById("recognitionResults")
    const resultTitle = document.getElementById("resultTitle")
    const resultConfidence = document.getElementById("resultConfidence")
    const resultAvatar = document.getElementById("resultAvatar")
    const resultName = document.getElementById("resultName")
    const resultDetails = document.getElementById("resultDetails")
    const attendanceTime = document.getElementById("attendanceTime")
    const attendanceDate = document.getElementById("attendanceDate")

    if (isSuccess && user) {
      resultTitle.textContent = "Recognition Successful"
      resultConfidence.textContent = `${(result.confidence * 100).toFixed(1)}%`
      resultConfidence.className = "result-confidence"

      resultAvatar.src = user.avatar || "/placeholder.svg?height=80&width=80"
      resultAvatar.alt = user.name

      resultName.textContent = user.name
      resultDetails.textContent = `${user.department} • ${user.role || "Employee"}`

      const now = new Date()
      attendanceTime.textContent = now.toLocaleTimeString()
      attendanceDate.textContent = now.toLocaleDateString()

      resultsSection.querySelector(".result-card").classList.remove("error")
    } else {
      resultTitle.textContent = "Recognition Failed"
      resultConfidence.textContent = result ? `${(result.confidence * 100).toFixed(1)}%` : "0%"
      resultConfidence.className = "result-confidence"

      resultAvatar.src = "/placeholder.svg?height=80&width=80"
      resultAvatar.alt = "Unknown User"

      resultName.textContent = "Unknown Person"
      resultDetails.textContent = "Not enrolled in the system"

      attendanceTime.textContent = "N/A"
      attendanceDate.textContent = "Please enroll first"

      resultsSection.querySelector(".result-card").classList.add("error")
    }

    resultsSection.classList.remove("hidden")

    // Auto-hide after 5 seconds
    setTimeout(() => {
      resultsSection.classList.add("hidden")
    }, 5000)
  }

  updateFaceCount(count) {
    const faceCountElement = document.getElementById("faceCount")
    if (faceCountElement) {
      faceCountElement.textContent = `Faces: ${count}`
    }
  }

  updateQualityDisplay(detections) {
    const qualityElement = document.getElementById("qualityScore")
    const confidenceFill = document.getElementById("confidenceFill")
    const confidenceValue = document.getElementById("confidenceValue")

    if (detections.length > 0) {
      const avgQuality =
        detections.reduce((sum, d) => sum + this.faceEngine.calculateFaceQuality(d), 0) / detections.length

      const qualityPercent = Math.round(avgQuality * 100)

      if (qualityElement) {
        qualityElement.textContent = `Quality: ${qualityPercent}%`
      }

      if (confidenceFill && confidenceValue) {
        confidenceFill.style.width = `${qualityPercent}%`
        confidenceValue.textContent = `${qualityPercent}%`
      }
    } else {
      if (qualityElement) {
        qualityElement.textContent = "Quality: --"
      }
      if (confidenceFill && confidenceValue) {
        confidenceFill.style.width = "0%"
        confidenceValue.textContent = "0%"
      }
    }
  }

  updateSystemStatus(message, type = "default") {
    const statusText = document.getElementById("statusText")
    const statusDot = document.querySelector(".status-dot")
    const recognitionStatus = document.getElementById("recognitionStatus")

    if (statusText) {
      statusText.textContent = message
    }

    if (recognitionStatus) {
      recognitionStatus.textContent = message
    }

    if (statusDot) {
      statusDot.classList.remove("active", "error", "scanning")
      if (type === "active") {
        statusDot.classList.add("active")
      } else if (type === "error") {
        statusDot.classList.add("error")
      } else if (type === "scanning") {
        statusDot.classList.add("scanning")
      }
    }
  }

  async updateAttendanceFeed(user) {
    const feedElement = document.getElementById("attendanceFeed")
    const todayCountElement = document.getElementById("todayCount")

    if (!feedElement) return

    // Create new feed item
    const feedItem = document.createElement("div")
    feedItem.className = "feed-item"
    feedItem.style.animation = "slideUp 0.3s ease-out"

    const now = new Date()
    feedItem.innerHTML = `
      <div class="feed-avatar">
        <img src="${user.avatar || "/placeholder.svg?height=40&width=40"}" 
             alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
      </div>
      <div class="feed-info">
        <div class="feed-name">${user.name}</div>
        <div class="feed-time">${now.toLocaleTimeString()}</div>
      </div>
      <div class="feed-status">✓</div>
    `

    // Insert at the beginning
    feedElement.insertBefore(feedItem, feedElement.firstChild)

    // Limit to 10 items
    while (feedElement.children.length > 10) {
      feedElement.removeChild(feedElement.lastChild)
    }

    // Update today's count
    if (todayCountElement) {
      const todayAttendance = await this.db.getTodayAttendance()
      todayCountElement.textContent = todayAttendance.length
    }
  }

  async stop() {
    try {
      this.isActive = false

      if (this.detectionInterval) {
        clearInterval(this.detectionInterval)
        this.detectionInterval = null
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop())
        this.stream = null
      }

      if (this.videoElement) {
        this.videoElement.srcObject = null
      }

      if (this.canvas) {
        const ctx = this.canvas.getContext("2d")
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }

      this.updateSystemStatus("System stopped", "default")
      await this.db.logActivity("info", "Attendance system stopped")
    } catch (error) {
      console.error("Error stopping attendance system:", error)
      await this.db.logActivity("error", `Error stopping system: ${error.message}`)
    }
  }
}

// Global attendance system instance
// const attendanceSystem = new AttendanceSystem()
