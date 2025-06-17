/**
 * Demo Face Recognition Attendance System
 * Fully functional demo without external dependencies
 */

// Global state
let isSystemActive = false
let videoStream = null
let enrollmentSamples = 0
let isEnrolling = false
let currentMode = "attendance"

// Demo database
let demoUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@company.com",
    department: "Engineering",
    role: "Software Engineer",
    avatar: "/placeholder.svg?height=80&width=80",
    lastSeen: new Date().toISOString(),
    totalAttendance: 15,
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@company.com",
    department: "Marketing",
    role: "Marketing Manager",
    avatar: "/placeholder.svg?height=80&width=80",
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
    totalAttendance: 12,
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike.johnson@company.com",
    department: "HR",
    role: "HR Specialist",
    avatar: "/placeholder.svg?height=80&width=80",
    lastSeen: new Date(Date.now() - 172800000).toISOString(),
    totalAttendance: 18,
  },
]

let attendanceRecords = [
  {
    id: 1,
    userId: 1,
    timestamp: new Date().toISOString(),
    confidence: 0.95,
  },
  {
    id: 2,
    userId: 2,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    confidence: 0.92,
  },
]

// Initialize application
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp()
})

async function initializeApp() {
  try {
    showLoadingScreen()

    // Simulate loading process
    await simulateLoading()

    // Initialize UI
    initializeUI()

    // Hide loading screen
    hideLoadingScreen()

    showToast('Demo system ready! Click "Start Camera" to begin.', "success")
  } catch (error) {
    console.error("App initialization failed:", error)
    showError("Initialization Failed", error.message)
  }
}

async function simulateLoading() {
  const steps = [
    { progress: 20, message: "Initializing database..." },
    { progress: 40, message: "Loading face detection models..." },
    { progress: 60, message: "Setting up camera interface..." },
    { progress: 80, message: "Preparing user interface..." },
    { progress: 100, message: "System ready!" },
  ]

  for (const step of steps) {
    updateLoadingProgress(step.progress, step.message)
    await new Promise((resolve) => setTimeout(resolve, 800))
  }
}

function showLoadingScreen() {
  document.getElementById("loadingScreen").classList.remove("hidden")
  document.getElementById("mainApp").classList.add("hidden")
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen")
  const mainApp = document.getElementById("mainApp")

  loadingScreen.style.opacity = "0"
  setTimeout(() => {
    loadingScreen.classList.add("hidden")
    mainApp.classList.remove("hidden")
  }, 500)
}

function updateLoadingProgress(percentage, status) {
  const progressFill = document.getElementById("progressFill")
  const loadingStatus = document.getElementById("loadingStatus")

  if (progressFill) {
    progressFill.style.width = `${percentage}%`
  }

  if (loadingStatus) {
    loadingStatus.textContent = status
  }
}

function initializeUI() {
  // Load user table
  loadUserTable()

  // Update stats
  updateStats()

  // Load attendance feed
  loadAttendanceFeed()

  // Set initial button states
  updateButtonStates()
}

// System control functions
async function initializeSystem() {
  try {
    showToast("Starting camera...", "info")

    // Request camera access
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
    }

    videoStream = await navigator.mediaDevices.getUserMedia(constraints)
    const videoElement = document.getElementById("videoElement")
    videoElement.srcObject = videoStream

    // Wait for video to load
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = resolve
    })

    isSystemActive = true
    updateButtonStates()
    updateSystemStatus("Camera active - Face detection ready", "active")

    // Start demo face detection
    startDemoDetection()

    showToast("Camera started successfully!", "success")
  } catch (error) {
    console.error("Camera initialization failed:", error)
    showToast("Camera access denied. Please allow camera permissions.", "error")
    updateSystemStatus("Camera access denied", "error")
  }
}

function startDemoDetection() {
  // Simulate face detection
  setInterval(() => {
    if (!isSystemActive) return

    // Simulate random face detection
    const hasFace = Math.random() > 0.3
    const faceCount = hasFace ? 1 : 0
    const quality = hasFace ? Math.floor(Math.random() * 40) + 60 : 0

    updateFaceCount(faceCount)
    updateQualityDisplay(quality)

    if (hasFace) {
      updateSystemStatus("Face detected", "active")
      showDemoFaceBox()
    } else {
      updateSystemStatus("No face detected", "scanning")
      hideDemoFaceBox()
    }
  }, 1000)
}

function showDemoFaceBox() {
  const overlay = document.getElementById("demoOverlay")
  if (overlay) {
    overlay.classList.remove("hidden")
  }
}

function hideDemoFaceBox() {
  const overlay = document.getElementById("demoOverlay")
  if (overlay) {
    overlay.classList.add("hidden")
  }
}

async function captureAttendance() {
  if (!isSystemActive) {
    showToast("Please start the camera first", "warning")
    return
  }

  try {
    showToast("Processing attendance...", "info")
    updateSystemStatus("Analyzing face...", "scanning")

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate recognition result (80% success rate)
    const isRecognized = Math.random() > 0.2

    if (isRecognized) {
      // Pick a random user
      const user = demoUsers[Math.floor(Math.random() * demoUsers.length)]
      const confidence = Math.floor(Math.random() * 20) + 80 // 80-100%

      // Record attendance
      const attendanceRecord = {
        id: attendanceRecords.length + 1,
        userId: user.id,
        timestamp: new Date().toISOString(),
        confidence: confidence / 100,
      }

      attendanceRecords.push(attendanceRecord)
      user.lastSeen = new Date().toISOString()
      user.totalAttendance++

      // Show success result
      showRecognitionResult(user, confidence, true)

      // Update UI
      updateStats()
      addToAttendanceFeed(user)

      showToast(`Welcome back, ${user.name}!`, "success")
    } else {
      // Show failure result
      showRecognitionResult(null, 0, false)
      showToast("Face not recognized. Please try again.", "error")
    }

    updateSystemStatus("Ready for next scan", "active")
  } catch (error) {
    console.error("Attendance capture failed:", error)
    showToast("Attendance capture failed", "error")
    updateSystemStatus("Capture failed", "error")
  }
}

function stopSystem() {
  try {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop())
      videoStream = null
    }

    const videoElement = document.getElementById("videoElement")
    if (videoElement) {
      videoElement.srcObject = null
    }

    isSystemActive = false
    updateButtonStates()
    updateSystemStatus("System stopped", "default")
    hideDemoFaceBox()

    showToast("System stopped", "info")
  } catch (error) {
    console.error("Error stopping system:", error)
    showToast("Error stopping system", "error")
  }
}

// UI Update functions
function updateButtonStates() {
  const startBtn = document.getElementById("startSystemBtn")
  const captureBtn = document.getElementById("captureBtn")
  const stopBtn = document.getElementById("stopSystemBtn")

  if (startBtn) startBtn.disabled = isSystemActive
  if (captureBtn) captureBtn.disabled = !isSystemActive
  if (stopBtn) stopBtn.disabled = !isSystemActive
}

function updateSystemStatus(message, type = "default") {
  const statusText = document.getElementById("statusText")
  const statusDot = document.getElementById("statusDot")
  const recognitionStatus = document.getElementById("recognitionStatus")

  if (statusText) {
    statusText.textContent = message
  }

  if (recognitionStatus) {
    recognitionStatus.textContent = message
  }

  if (statusDot) {
    statusDot.className = "status-dot"
    if (type === "active") {
      statusDot.classList.add("active")
    } else if (type === "error") {
      statusDot.classList.add("error")
    } else if (type === "scanning") {
      statusDot.classList.add("scanning")
    }
  }
}

function updateFaceCount(count) {
  const faceCountElement = document.getElementById("faceCount")
  if (faceCountElement) {
    faceCountElement.textContent = `Faces: ${count}`
  }
}

function updateQualityDisplay(quality) {
  const qualityElement = document.getElementById("qualityScore")
  const confidenceFill = document.getElementById("confidenceFill")
  const confidenceValue = document.getElementById("confidenceValue")

  if (qualityElement) {
    qualityElement.textContent = `Quality: ${quality}%`
  }

  if (confidenceFill && confidenceValue) {
    confidenceFill.style.width = `${quality}%`
    confidenceValue.textContent = `${quality}%`
  }
}

function showRecognitionResult(user, confidence, isSuccess) {
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
    resultConfidence.textContent = `${confidence}%`
    resultConfidence.className = "result-confidence"

    resultAvatar.src = user.avatar
    resultAvatar.alt = user.name

    resultName.textContent = user.name
    resultDetails.textContent = `${user.department} • ${user.role}`

    const now = new Date()
    attendanceTime.textContent = now.toLocaleTimeString()
    attendanceDate.textContent = now.toLocaleDateString()

    resultsSection.querySelector(".result-card").classList.remove("error")
  } else {
    resultTitle.textContent = "Recognition Failed"
    resultConfidence.textContent = "0%"
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

// Enrollment functions
async function startEnrollment() {
  try {
    // Validate form
    const form = document.getElementById("userForm")
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    // Start camera for enrollment
    const constraints = {
      video: {
        width: { ideal: 480 },
        height: { ideal: 360 },
        facingMode: "user",
      },
    }

    const enrollmentStream = await navigator.mediaDevices.getUserMedia(constraints)
    const enrollmentVideo = document.getElementById("enrollmentVideo")
    enrollmentVideo.srcObject = enrollmentStream

    isEnrolling = true
    enrollmentSamples = 0
    updateEnrollmentUI()

    showToast("Enrollment started. Capture 5 face samples.", "info")
  } catch (error) {
    console.error("Enrollment start failed:", error)
    showToast("Failed to start enrollment. Please allow camera access.", "error")
  }
}

async function captureEnrollmentSample() {
  if (!isEnrolling || enrollmentSamples >= 5) {
    return
  }

  try {
    // Simulate sample capture
    enrollmentSamples++
    updateEnrollmentUI()

    const quality = Math.floor(Math.random() * 20) + 80 // 80-100%

    showToast(`Sample ${enrollmentSamples}/5 captured (Quality: ${quality}%)`, "success")

    if (enrollmentSamples >= 5) {
      showToast('All samples captured! Click "Complete Enrollment"', "info")
    }
  } catch (error) {
    console.error("Sample capture failed:", error)
    showToast("Failed to capture sample", "error")
  }
}

async function completeEnrollment() {
  if (enrollmentSamples < 5) {
    showToast(`Need ${5 - enrollmentSamples} more samples`, "warning")
    return
  }

  try {
    // Get form data
    const formData = new FormData(document.getElementById("userForm"))
    const userData = {
      id: demoUsers.length + 1,
      name: formData.get("userName"),
      email: formData.get("userEmail"),
      department: formData.get("userDepartment"),
      role: formData.get("userRole") || "Employee",
      avatar: "/placeholder.svg?height=80&width=80",
      lastSeen: null,
      totalAttendance: 0,
    }

    // Check for duplicate email
    if (demoUsers.some((user) => user.email === userData.email)) {
      throw new Error("Email already exists in the system")
    }

    // Add user to demo database
    demoUsers.push(userData)

    // Stop enrollment
    stopEnrollment()

    // Update UI
    loadUserTable()
    updateStats()

    showToast(`User ${userData.name} enrolled successfully!`, "success")

    // Switch to attendance mode
    setTimeout(() => switchMode("attendance"), 2000)
  } catch (error) {
    console.error("Enrollment completion failed:", error)
    showToast(`Enrollment failed: ${error.message}`, "error")
  }
}

function stopEnrollment() {
  isEnrolling = false
  enrollmentSamples = 0

  const enrollmentVideo = document.getElementById("enrollmentVideo")
  if (enrollmentVideo && enrollmentVideo.srcObject) {
    enrollmentVideo.srcObject.getTracks().forEach((track) => track.stop())
    enrollmentVideo.srcObject = null
  }

  // Clear form
  document.getElementById("userForm").reset()
  updateEnrollmentUI()
}

function updateEnrollmentUI() {
  const sampleCount = document.getElementById("sampleCount")
  const enrollmentQuality = document.getElementById("enrollmentQuality")
  const enrollmentProgress = document.getElementById("enrollmentProgress")
  const startBtn = document.getElementById("startEnrollmentBtn")
  const captureBtn = document.getElementById("captureEnrollmentBtn")
  const completeBtn = document.getElementById("completeEnrollmentBtn")

  if (sampleCount) {
    sampleCount.textContent = enrollmentSamples
  }

  if (enrollmentProgress) {
    const progress = (enrollmentSamples / 5) * 100
    enrollmentProgress.style.width = `${progress}%`
  }

  if (enrollmentSamples > 0 && enrollmentQuality) {
    const avgQuality = Math.floor(Math.random() * 20) + 80
    enrollmentQuality.textContent = `${avgQuality}%`
  }

  // Update button states
  if (startBtn) startBtn.disabled = isEnrolling
  if (captureBtn) captureBtn.disabled = !isEnrolling
  if (completeBtn) completeBtn.disabled = !isEnrolling || enrollmentSamples < 5
}

// Management functions
function loadUserTable() {
  const tableBody = document.getElementById("userTableBody")
  if (!tableBody) return

  tableBody.innerHTML = ""

  demoUsers.forEach((user) => {
    const row = document.createElement("tr")
    row.innerHTML = `
            <td>
                <img src="${user.avatar}" alt="${user.name}" class="user-avatar">
            </td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.department}</td>
            <td>${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never"}</td>
            <td>${user.totalAttendance}</td>
            <td>
                <button onclick="editUser(${user.id})" class="action-btn edit">Edit</button>
                <button onclick="deleteUser(${user.id})" class="action-btn delete">Delete</button>
            </td>
        `
    tableBody.appendChild(row)
  })
}

function updateStats() {
  const totalUsersElement = document.getElementById("totalUsers")
  const todayCountElement = document.getElementById("todayCount")

  if (totalUsersElement) {
    totalUsersElement.textContent = demoUsers.length
  }

  if (todayCountElement) {
    const today = new Date().toDateString()
    const todayAttendance = attendanceRecords.filter((record) => new Date(record.timestamp).toDateString() === today)
    todayCountElement.textContent = todayAttendance.length
  }
}

function loadAttendanceFeed() {
  const feedElement = document.getElementById("attendanceFeed")
  if (!feedElement) return

  feedElement.innerHTML = ""

  // Get recent attendance records
  const recentRecords = attendanceRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)

  recentRecords.forEach((record) => {
    const user = demoUsers.find((u) => u.id === record.userId)
    if (user) {
      addToAttendanceFeed(user, record.timestamp)
    }
  })
}

function addToAttendanceFeed(user, timestamp = null) {
  const feedElement = document.getElementById("attendanceFeed")
  if (!feedElement) return

  const feedItem = document.createElement("div")
  feedItem.className = "feed-item"
  feedItem.style.animation = "slideUp 0.3s ease-out"

  const time = timestamp ? new Date(timestamp) : new Date()
  feedItem.innerHTML = `
        <div class="feed-avatar">
            <img src="${user.avatar}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
        </div>
        <div class="feed-info">
            <div class="feed-name">${user.name}</div>
            <div class="feed-time">${time.toLocaleTimeString()}</div>
        </div>
        <div class="feed-status">✓</div>
    `

  // Insert at the beginning
  feedElement.insertBefore(feedItem, feedElement.firstChild)

  // Limit to 10 items
  while (feedElement.children.length > 10) {
    feedElement.removeChild(feedElement.lastChild)
  }
}

// User management functions
function editUser(userId) {
  const user = demoUsers.find((u) => u.id === userId)
  if (!user) {
    showToast("User not found", "error")
    return
  }

  const newName = prompt("Enter new name:", user.name)
  if (newName && newName !== user.name) {
    user.name = newName
    loadUserTable()
    showToast("User updated successfully", "success")
  }
}

function deleteUser(userId) {
  const user = demoUsers.find((u) => u.id === userId)
  if (!user) {
    showToast("User not found", "error")
    return
  }

  if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
    demoUsers = demoUsers.filter((u) => u.id !== userId)
    attendanceRecords = attendanceRecords.filter((r) => r.userId !== userId)

    loadUserTable()
    updateStats()
    loadAttendanceFeed()

    showToast("User deleted successfully", "success")
  }
}

function searchUsers() {
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

function filterUsers() {
  const filterDepartment = document.getElementById("departmentFilter").value
  const rows = document.querySelectorAll("#userTableBody tr")

  rows.forEach((row) => {
    const department = row.cells[3].textContent
    const matches = !filterDepartment || department === filterDepartment
    row.style.display = matches ? "" : "none"
  })
}

function refreshUserList() {
  loadUserTable()
  showToast("User list refreshed", "info")
}

// Mode switching
function switchMode(mode) {
  const modes = ["attendance", "enrollment", "management"]

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

  currentMode = mode

  // Mode-specific initialization
  if (mode === "management") {
    loadUserTable()
    updateStats()
  }
}

// Utility functions
function showToast(message, type = "info") {
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

function showError(title, message) {
  const modal = document.getElementById("errorModal")
  const errorMessage = document.getElementById("errorMessage")

  if (modal && errorMessage) {
    errorMessage.textContent = message
    modal.classList.remove("hidden")
  }

  showToast(message, "error")
}

function closeErrorModal() {
  const modal = document.getElementById("errorModal")
  if (modal) modal.classList.add("hidden")
}

function toggleErrorDetails() {
  const details = document.getElementById("errorDetails")
  if (details) {
    details.classList.toggle("hidden")
  }
}

function retryOperation() {
  closeErrorModal()
  initializeApp()
}

function exportData() {
  try {
    const data = {
      exportDate: new Date().toISOString(),
      users: demoUsers,
      attendance: attendanceRecords,
      stats: {
        totalUsers: demoUsers.length,
        totalAttendance: attendanceRecords.length,
        todayAttendance: attendanceRecords.filter(
          (record) => new Date(record.timestamp).toDateString() === new Date().toDateString(),
        ).length,
      },
    }

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

    showToast("Data exported successfully", "success")
  } catch (error) {
    console.error("Export error:", error)
    showToast("Failed to export data", "error")
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop())
  }
})
