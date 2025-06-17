/**
 * User Management System
 * Handles user enrollment, management, and data operations
 */
class UserManagement {
  constructor(db, faceEngine, showToast, switchMode) {
    this.enrollmentVideo = null
    this.enrollmentCanvas = null
    this.enrollmentStream = null
    this.enrollmentSamples = []
    this.isEnrolling = false
    this.requiredSamples = 5
    this.db = db
    this.faceEngine = faceEngine
    this.showToast = showToast
    this.switchMode = switchMode
  }

  async initialize() {
    try {
      this.enrollmentVideo = document.getElementById("enrollmentVideo")
      this.enrollmentCanvas = document.getElementById("enrollmentCanvas")

      if (!this.enrollmentVideo || !this.enrollmentCanvas) {
        throw new Error("Enrollment elements not found")
      }

      await this.loadUserTable()
      await this.updateStats()

      await this.db.logActivity("info", "User management system initialized")
      return true
    } catch (error) {
      await this.db.logActivity("error", `User management initialization failed: ${error.message}`)
      throw error
    }
  }

  async startEnrollment() {
    try {
      if (!this.faceEngine.isInitialized) {
        throw new Error("Face recognition engine not initialized")
      }

      // Validate form
      const form = document.getElementById("userForm")
      if (!form.checkValidity()) {
        form.reportValidity()
        return false
      }

      // Start camera
      const constraints = {
        video: {
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
          facingMode: "user",
        },
      }

      this.enrollmentStream = await navigator.mediaDevices.getUserMedia(constraints)
      this.enrollmentVideo.srcObject = this.enrollmentStream

      await new Promise((resolve, reject) => {
        this.enrollmentVideo.onloadedmetadata = () => {
          this.enrollmentCanvas.width = this.enrollmentVideo.videoWidth
          this.enrollmentCanvas.height = this.enrollmentVideo.videoHeight
          resolve()
        }
        this.enrollmentVideo.onerror = reject
      })

      this.isEnrolling = true
      this.enrollmentSamples = []

      this.updateEnrollmentUI()
      this.showToast("Enrollment started. Position your face in the center and capture samples.", "info")

      return true
    } catch (error) {
      console.error("Enrollment start error:", error)
      this.showToast(`Failed to start enrollment: ${error.message}`, "error")
      return false
    }
  }

  async captureEnrollmentSample() {
    if (!this.isEnrolling || this.enrollmentSamples.length >= this.requiredSamples) {
      return false
    }

    try {
      // Detect faces
      const detections = await this.faceEngine.detectFaces(this.enrollmentVideo)

      if (detections.length === 0) {
        this.showToast("No face detected. Please position yourself properly.", "warning")
        return false
      }

      if (detections.length > 1) {
        this.showToast("Multiple faces detected. Please ensure only one person is visible.", "warning")
        return false
      }

      const detection = detections[0]

      // Validate quality
      const validation = await this.faceEngine.validateEnrollmentQuality(detection)

      if (!validation.isValid) {
        this.showToast(`Sample quality too low: ${validation.issues.join(", ")}`, "warning")
        return false
      }

      // Store sample
      this.enrollmentSamples.push({
        descriptor: detection.descriptor,
        quality: validation.quality,
        timestamp: new Date().toISOString(),
      })

      this.updateEnrollmentProgress()

      this.showToast(
        `Sample ${this.enrollmentSamples.length}/${this.requiredSamples} captured successfully!`,
        "success",
      )

      // Auto-complete if we have enough samples
      if (this.enrollmentSamples.length >= this.requiredSamples) {
        setTimeout(() => this.completeEnrollment(), 1000)
      }

      return true
    } catch (error) {
      console.error("Sample capture error:", error)
      this.showToast("Failed to capture sample. Please try again.", "error")
      return false
    }
  }

  async completeEnrollment() {
    if (this.enrollmentSamples.length < this.requiredSamples) {
      this.showToast(`Need ${this.requiredSamples - this.enrollmentSamples.length} more samples.`, "warning")
      return false
    }

    try {
      // Get form data
      const formData = new FormData(document.getElementById("userForm"))
      const userData = {
        name: formData.get("userName"),
        email: formData.get("userEmail"),
        department: formData.get("userDepartment"),
        role: formData.get("userRole") || "Employee",
      }

      // Validate email uniqueness
      const existingUsers = await this.db.getAllUsers()
      if (existingUsers.some((user) => user.email === userData.email)) {
        throw new Error("Email already exists in the system")
      }

      // Create user
      const userId = await this.db.addUser(userData)

      // Store face descriptors
      for (const sample of this.enrollmentSamples) {
        await this.faceEngine.enrollFace(userId, sample.descriptor, {
          quality: sample.quality,
          timestamp: sample.timestamp,
        })
      }

      // Clean up
      this.stopEnrollment()
      this.clearEnrollmentForm()

      // Refresh UI
      await this.loadUserTable()
      await this.updateStats()

      this.showToast(`User ${userData.name} enrolled successfully!`, "success")

      // Switch back to attendance mode
      setTimeout(() => this.switchMode("attendance"), 2000)

      return true
    } catch (error) {
      console.error("Enrollment completion error:", error)
      await this.db.logActivity("error", `Enrollment failed: ${error.message}`)
      this.showToast(`Enrollment failed: ${error.message}`, "error")
      return false
    }
  }

  stopEnrollment() {
    this.isEnrolling = false

    if (this.enrollmentStream) {
      this.enrollmentStream.getTracks().forEach((track) => track.stop())
      this.enrollmentStream = null
    }

    if (this.enrollmentVideo) {
      this.enrollmentVideo.srcObject = null
    }

    if (this.enrollmentCanvas) {
      const ctx = this.enrollmentCanvas.getContext("2d")
      ctx.clearRect(0, 0, this.enrollmentCanvas.width, this.enrollmentCanvas.height)
    }

    this.enrollmentSamples = []
    this.updateEnrollmentUI()
  }

  updateEnrollmentUI() {
    const sampleCount = document.getElementById("sampleCount")
    const enrollmentQuality = document.getElementById("enrollmentQuality")
    const enrollmentProgress = document.getElementById("enrollmentProgress")
    const startBtn = document.getElementById("startEnrollmentBtn")
    const captureBtn = document.getElementById("captureEnrollmentBtn")
    const completeBtn = document.getElementById("completeEnrollmentBtn")

    if (sampleCount) {
      sampleCount.textContent = this.enrollmentSamples.length
    }

    if (enrollmentProgress) {
      const progress = (this.enrollmentSamples.length / this.requiredSamples) * 100
      enrollmentProgress.style.width = `${progress}%`
    }

    if (this.enrollmentSamples.length > 0 && enrollmentQuality) {
      const avgQuality = this.enrollmentSamples.reduce((sum, s) => sum + s.quality, 0) / this.enrollmentSamples.length
      enrollmentQuality.textContent = `${Math.round(avgQuality * 100)}%`
    }

    // Update button states
    if (startBtn) startBtn.disabled = this.isEnrolling
    if (captureBtn) captureBtn.disabled = !this.isEnrolling
    if (completeBtn) completeBtn.disabled = !this.isEnrolling || this.enrollmentSamples.length < this.requiredSamples
  }

  updateEnrollmentProgress() {
    this.updateEnrollmentUI()
  }

  clearEnrollmentForm() {
    const form = document.getElementById("userForm")
    if (form) {
      form.reset()
    }
    this.updateEnrollmentUI()
  }

  async loadUserTable() {
    try {
      const users = await this.db.getAllUsers()
      const tableBody = document.getElementById("userTableBody")

      if (!tableBody) return

      tableBody.innerHTML = ""

      for (const user of users) {
        const row = document.createElement("tr")
        row.innerHTML = `
          <td>
            <img src="${user.avatar || "/placeholder.svg?height=50&width=50"}" 
                 alt="${user.name}" class="user-avatar">
          </td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.department}</td>
          <td>${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}</td>
          <td>${user.totalAttendance || 0}</td>
          <td>
            <button onclick="userManagement.editUser(${user.id})" class="action-btn edit">Edit</button>
            <button onclick="userManagement.deleteUser(${user.id})" class="action-btn delete">Delete</button>
          </td>
        `
        tableBody.appendChild(row)
      }
    } catch (error) {
      console.error("Failed to load user table:", error)
      this.showToast("Failed to load users", "error")
    }
  }

  async updateStats() {
    try {
      const users = await this.db.getAllUsers()
      const todayAttendance = await this.db.getTodayAttendance()

      const totalUsersElement = document.getElementById("totalUsers")
      const todayCountElement = document.getElementById("todayCount")

      if (totalUsersElement) {
        totalUsersElement.textContent = users.length
      }

      if (todayCountElement) {
        todayCountElement.textContent = todayAttendance.length
      }
    } catch (error) {
      console.error("Failed to update stats:", error)
    }
  }

  async editUser(userId) {
    try {
      const user = await this.db.getUser(userId)
      if (!user) {
        this.showToast("User not found", "error")
        return
      }

      // Simple edit implementation - in production, you'd want a proper modal
      const newName = prompt("Enter new name:", user.name)
      if (newName && newName !== user.name) {
        await this.db.updateUser(userId, { name: newName })
        await this.loadUserTable()
        this.showToast("User updated successfully", "success")
      }
    } catch (error) {
      console.error("Edit user error:", error)
      this.showToast("Failed to edit user", "error")
    }
  }

  async deleteUser(userId) {
    try {
      const user = await this.db.getUser(userId)
      if (!user) {
        this.showToast("User not found", "error")
        return
      }

      if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
        await this.db.deleteUser(userId)
        await this.loadUserTable()
        await this.updateStats()

        // Reload face descriptors in recognition engine
        await this.faceEngine.loadFaceDescriptors()

        this.showToast("User deleted successfully", "success")
      }
    } catch (error) {
      console.error("Delete user error:", error)
      this.showToast("Failed to delete user", "error")
    }
  }

  async searchUsers() {
    const searchTerm = document.getElementById("searchUsers").value.toLowerCase()
    const rows = document.querySelectorAll("#userTableBody tr")

    rows.forEach((row) => {
      const name = row.cells[1].textContent.toLowerCase()
      const email = row.cells[2].textContent.toLowerCase()
      const department = row.cells[3].textContent.toLowerCase()

      const matches = name.includes(searchTerm) || email.includes(searchTerm) || department.includes(searchTerm)

      row.style.display = matches ? "" : "none"
    })
  }

  async filterUsers() {
    const filterDepartment = document.getElementById("departmentFilter").value
    const rows = document.querySelectorAll("#userTableBody tr")

    rows.forEach((row) => {
      const department = row.cells[3].textContent
      const matches = !filterDepartment || department === filterDepartment
      row.style.display = matches ? "" : "none"
    })
  }
}

// Global user management instance
const userManagement = new UserManagement(db, faceEngine, showToast, switchMode)

// Global functions for HTML onclick handlers
window.startEnrollment = () => userManagement.startEnrollment()
window.captureEnrollmentSample = () => userManagement.captureEnrollmentSample()
window.completeEnrollment = () => userManagement.completeEnrollment()
window.searchUsers = () => userManagement.searchUsers()
window.filterUsers = () => userManagement.filterUsers()
window.refreshUserList = () => userManagement.loadUserTable()
