// Global variables
let videoStream = null
let isScanning = false
let capturedImage = null
let recognitionAttempts = 0
const MAX_ATTEMPTS = 3

// Enhanced user database with more details
const userDatabase = [
  {
    id: 1,
    name: "Alice Johnson",
    avatar: "/placeholder.svg?height=60&width=60",
    department: "Engineering",
    lastSeen: null,
    attendanceCount: 0,
  },
  {
    id: 2,
    name: "Bob Smith",
    avatar: "/placeholder.svg?height=60&width=60",
    department: "Marketing",
    lastSeen: null,
    attendanceCount: 0,
  },
  {
    id: 3,
    name: "Carol Davis",
    avatar: "/placeholder.svg?height=60&width=60",
    department: "HR",
    lastSeen: null,
    attendanceCount: 0,
  },
  {
    id: 4,
    name: "David Wilson",
    avatar: "/placeholder.svg?height=60&width=60",
    department: "Finance",
    lastSeen: null,
    attendanceCount: 0,
  },
]

// Enhanced DOM elements
const videoFeed = document.getElementById("videoFeed")
const captureCanvas = document.getElementById("captureCanvas")
const scanningOverlay = document.getElementById("scanningOverlay")
const statusDisplay = document.getElementById("statusDisplay")
const statusText = document.getElementById("statusText")
const confirmationCard = document.getElementById("confirmationCard")
const startCameraBtn = document.getElementById("startCameraBtn")
const captureBtn = document.getElementById("captureBtn")
const checkAttendanceBtn = document.getElementById("checkAttendanceBtn")

// Enhanced initialization
document.addEventListener("DOMContentLoaded", () => {
  updateButtonStates()
  loadAttendanceData()
  setupKeyboardShortcuts()

  // Auto-hide privacy banner after 5 seconds
  setTimeout(() => {
    closePrivacyBanner()
  }, 5000)
})

// Local storage functions
function saveAttendanceData() {
  localStorage.setItem("attendanceData", JSON.stringify(userDatabase))
  localStorage.setItem("attendanceHistory", JSON.stringify(getAttendanceHistory()))
}

function loadAttendanceData() {
  const savedData = localStorage.getItem("attendanceData")
  const savedHistory = localStorage.getItem("attendanceHistory")

  if (savedData) {
    const parsedData = JSON.parse(savedData)
    // Merge with existing database
    parsedData.forEach((savedUser) => {
      const existingUser = userDatabase.find((u) => u.id === savedUser.id)
      if (existingUser) {
        existingUser.lastSeen = savedUser.lastSeen
        existingUser.attendanceCount = savedUser.attendanceCount
      }
    })
  }

  if (savedHistory) {
    const history = JSON.parse(savedHistory)
    displayAttendanceHistory(history)
  }
}

function getAttendanceHistory() {
  const attendanceList = document.getElementById("attendanceList")
  const items = Array.from(attendanceList.children)
  return items.map((item) => ({
    name: item.querySelector(".item-name").textContent,
    time: item.querySelector(".item-time").textContent,
    timestamp: Date.now(),
  }))
}

// Enhanced keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    // Prevent shortcuts when typing in input fields
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
      return
    }

    switch (event.key.toLowerCase()) {
      case "s":
        if (!startCameraBtn.disabled) {
          startCamera()
        }
        break
      case "c":
        if (!captureBtn.disabled) {
          captureImage()
        }
        break
      case "a":
        if (!checkAttendanceBtn.disabled) {
          checkAttendance()
        }
        break
      case "escape":
        if (isScanning) {
          cancelScanning()
        }
        break
    }
  })
}

// Enhanced privacy banner with better UX
function closePrivacyBanner() {
  const banner = document.getElementById("privacyBanner")
  if (banner && banner.style.display !== "none") {
    banner.style.animation = "slideUp 0.3s ease-out reverse"
    setTimeout(() => {
      banner.style.display = "none"
    }, 300)
  }
}

// Enhanced camera functions with better error handling
async function startCamera() {
  try {
    updateStatus("Requesting camera access...", "scanning")

    // Check if camera is available
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter((device) => device.kind === "videoinput")

    if (videoDevices.length === 0) {
      throw new Error("No camera devices found")
    }

    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
    }

    videoStream = await navigator.mediaDevices.getUserMedia(constraints)
    videoFeed.srcObject = videoStream

    videoFeed.onloadedmetadata = () => {
      updateStatus('Camera ready - Press "C" to capture', "success")
      updateButtonStates()
      showToast("Camera started successfully! Use keyboard shortcuts: S=Start, C=Capture, A=Attendance", "success")
    }
  } catch (error) {
    console.error("Error accessing camera:", error)
    let errorMessage = "Camera access denied"

    if (error.name === "NotFoundError") {
      errorMessage = "No camera found on this device"
    } else if (error.name === "NotAllowedError") {
      errorMessage = "Camera permission denied. Please allow camera access."
    } else if (error.name === "NotReadableError") {
      errorMessage = "Camera is being used by another application"
    }

    updateStatus(errorMessage, "error")
    showToast(errorMessage, "error")
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop())
    videoStream = null
    videoFeed.srcObject = null
    updateStatus("Camera stopped", "default")
    updateButtonStates()
    showToast("Camera stopped", "info")
  }
}

// Enhanced capture with cancel functionality
function captureImage() {
  if (!videoStream) {
    showToast("Please start camera first", "warning")
    return
  }

  recognitionAttempts = 0 // Reset attempts
  startCountdown()
}

function cancelScanning() {
  if (isScanning) {
    isScanning = false
    scanningOverlay.classList.add("hidden")
    updateStatus("Scanning cancelled", "default")
    showToast("Scanning cancelled", "warning")
  }
}

function startCountdown() {
  if (isScanning) return

  isScanning = true
  scanningOverlay.classList.remove("hidden")
  const countdown = document.getElementById("countdown")
  let count = 3

  updateStatus("Get ready... (Press ESC to cancel)", "scanning")

  const countdownInterval = setInterval(() => {
    if (!isScanning) {
      clearInterval(countdownInterval)
      return
    }

    countdown.textContent = count

    if (count === 0) {
      clearInterval(countdownInterval)
      countdown.textContent = "CAPTURE!"

      setTimeout(() => {
        if (isScanning) {
          performCapture()
          scanningOverlay.classList.add("hidden")
          isScanning = false
        }
      }, 500)
    }

    count--
  }, 1000)
}

function performCapture() {
  const canvas = captureCanvas
  const context = canvas.getContext("2d")

  canvas.width = videoFeed.videoWidth
  canvas.height = videoFeed.videoHeight

  context.drawImage(videoFeed, 0, 0, canvas.width, canvas.height)
  capturedImage = canvas.toDataURL("image/jpeg", 0.8)

  updateStatus('Image captured successfully - Press "A" to check attendance', "success")
  updateButtonStates()
  showToast('Image captured! Click "Check Attendance" to proceed', "success")
}

// Enhanced attendance checking with retry logic
async function checkAttendance() {
  if (!capturedImage) {
    showToast("Please capture an image first", "warning")
    return
  }

  recognitionAttempts++
  updateStatus("Analyzing face...", "scanning")
  showToast(`Processing face recognition... (Attempt ${recognitionAttempts}/${MAX_ATTEMPTS})`, "info")

  // Simulate face recognition processing
  await simulateProcessing(2000)

  // Simulate recognition result with better logic
  const baseSuccessRate = 0.7
  const attemptPenalty = (recognitionAttempts - 1) * 0.1
  const successRate = Math.max(0.3, baseSuccessRate - attemptPenalty)
  const isRecognized = Math.random() < successRate

  if (isRecognized) {
    const user = userDatabase[Math.floor(Math.random() * userDatabase.length)]

    // Update user data
    user.lastSeen = new Date().toISOString()
    user.attendanceCount++

    showSuccessResult(user)
    addToAttendanceHistory(user)
    saveAttendanceData()

    // Reset for next capture
    capturedImage = null
    recognitionAttempts = 0
    updateButtonStates()
  } else {
    showFailureResult()

    if (recognitionAttempts >= MAX_ATTEMPTS) {
      showToast(`Maximum attempts (${MAX_ATTEMPTS}) reached. Please try again later.`, "error")
      capturedImage = null
      recognitionAttempts = 0
      updateButtonStates()
    } else {
      showToast(`Recognition failed. ${MAX_ATTEMPTS - recognitionAttempts} attempts remaining.`, "warning")
    }
  }
}

function simulateProcessing(duration) {
  return new Promise((resolve) => {
    let dots = ""
    const interval = setInterval(() => {
      dots = dots.length >= 3 ? "" : dots + "."
      updateStatus(`Scanning${dots}`, "scanning")
    }, 300)

    setTimeout(() => {
      clearInterval(interval)
      resolve()
    }, duration)
  })
}

// Enhanced success result with more details
function showSuccessResult(user) {
  updateStatus("Face recognized!", "success")

  const userAvatar = document.getElementById("userAvatar")
  const userName = document.getElementById("userName")
  const timestamp = document.getElementById("timestamp")
  const statusIcon = document.getElementById("statusIcon")

  userAvatar.src = user.avatar
  userAvatar.alt = user.name
  userName.textContent = `Welcome, ${user.name}`

  const now = new Date()
  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  const dateString = now.toLocaleDateString()

  timestamp.textContent = `${dateString} at ${timeString}`
  statusIcon.textContent = "✅"
  statusIcon.classList.remove("error")

  confirmationCard.classList.remove("hidden")
  showToast(`Welcome back, ${user.name}! (${user.attendanceCount} total check-ins)`, "success")

  // Play success sound (if available)
  playNotificationSound("success")

  // Hide confirmation card after 5 seconds
  setTimeout(() => {
    confirmationCard.classList.add("hidden")
  }, 5000)
}

function showFailureResult() {
  updateStatus("Face not recognized", "error")

  const userAvatar = document.getElementById("userAvatar")
  const userName = document.getElementById("userName")
  const timestamp = document.getElementById("timestamp")
  const statusIcon = document.getElementById("statusIcon")

  userAvatar.src = "/placeholder.svg?height=60&width=60"
  userAvatar.alt = "Unknown User"
  userName.textContent = "Face not recognized"

  if (recognitionAttempts < MAX_ATTEMPTS) {
    timestamp.textContent = `Please try again (${MAX_ATTEMPTS - recognitionAttempts} attempts left)`
  } else {
    timestamp.textContent = "Maximum attempts reached"
  }

  statusIcon.textContent = "❌"
  statusIcon.classList.add("error")

  confirmationCard.classList.remove("hidden")
  showToast("Face not recognized - please try again", "error")

  // Play error sound (if available)
  playNotificationSound("error")

  // Hide confirmation card after 5 seconds
  setTimeout(() => {
    confirmationCard.classList.add("hidden")
  }, 5000)
}

// Enhanced utility functions
function updateStatus(message, type = "default") {
  statusText.textContent = message
  statusDisplay.className = "status-display"

  if (type === "success") {
    statusDisplay.classList.add("status-success")
  } else if (type === "error") {
    statusDisplay.classList.add("status-error")
  } else if (type === "scanning") {
    statusDisplay.classList.add("status-scanning")
  }
}

function updateButtonStates() {
  const hasCamera = !!videoStream
  const hasCapture = !!capturedImage

  startCameraBtn.disabled = hasCamera
  captureBtn.disabled = !hasCamera || isScanning
  checkAttendanceBtn.disabled = !hasCapture || isScanning

  if (hasCamera) {
    startCameraBtn.textContent = "📹 Camera Active"
    startCameraBtn.style.background = "linear-gradient(135deg, #28a745, #20c997)"
  } else {
    startCameraBtn.textContent = "📹 Start Camera (S)"
    startCameraBtn.style.background = "linear-gradient(135deg, #667eea, #764ba2)"
  }

  captureBtn.textContent = hasCamera ? "📸 Capture (C)" : "📸 Capture"
  checkAttendanceBtn.textContent = hasCapture ? "✅ Check Attendance (A)" : "✅ Check Attendance"
}

// Enhanced toast with better management
function showToast(message, type = "info") {
  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `

  const container = document.getElementById("toastContainer")
  container.appendChild(toast)

  // Auto-remove toast after 4 seconds
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

// Enhanced attendance history with better data management
function addToAttendanceHistory(user) {
  const attendanceList = document.getElementById("attendanceList")
  const newItem = document.createElement("div")
  newItem.className = "attendance-item"
  newItem.style.animation = "slideUp 0.3s ease-out"

  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  newItem.innerHTML = `
        <div class="item-avatar">👤</div>
        <div class="item-info">
            <span class="item-name">${user.name}</span>
            <span class="item-time">${currentTime}</span>
            <span class="item-department">${user.department}</span>
        </div>
        <div class="item-status success">✓</div>
    `

  // Insert at the beginning of the list
  attendanceList.insertBefore(newItem, attendanceList.firstChild)

  // Limit to 10 recent entries
  while (attendanceList.children.length > 10) {
    attendanceList.removeChild(attendanceList.lastChild)
  }
}

function displayAttendanceHistory(history) {
  const attendanceList = document.getElementById("attendanceList")
  attendanceList.innerHTML = "" // Clear existing items

  history.forEach((entry) => {
    const item = document.createElement("div")
    item.className = "attendance-item"
    item.innerHTML = `
            <div class="item-avatar">👤</div>
            <div class="item-info">
                <span class="item-name">${entry.name}</span>
                <span class="item-time">${entry.time}</span>
            </div>
            <div class="item-status success">✓</div>
        `
    attendanceList.appendChild(item)
  })
}

// Audio feedback (optional)
function playNotificationSound(type) {
  // Create audio context for sound feedback
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (AudioContext) {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === "success") {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
    } else {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1)
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  }
}

// Enhanced cleanup and performance
window.addEventListener("beforeunload", () => {
  saveAttendanceData()
  stopCamera()
})

// Enhanced visibility handling
document.addEventListener("visibilitychange", () => {
  if (document.hidden && videoStream) {
    // Pause video stream when tab is not visible
    videoStream.getTracks().forEach((track) => {
      track.enabled = false
    })
  } else if (!document.hidden && videoStream) {
    // Resume video stream when tab becomes visible
    videoStream.getTracks().forEach((track) => {
      track.enabled = true
    })
  }
})

// Performance monitoring
const performanceMetrics = {
  cameraStartTime: 0,
  captureTime: 0,
  recognitionTime: 0,
}

function logPerformance(action, startTime) {
  const endTime = performance.now()
  const duration = endTime - startTime
  performanceMetrics[action] = duration
  console.log(`${action} took ${duration.toFixed(2)}ms`)
}
