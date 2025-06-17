/**
 * Production Face Recognition Engine
 * Handles all face detection and recognition operations
 */
import * as faceapi from "face-api.js"
import db from "./db" // Assuming db is imported from a separate module

class FaceRecognitionEngine {
  constructor() {
    this.isInitialized = false
    this.models = {
      ssdMobilenetv1: false,
      faceLandmark68Net: false,
      faceRecognitionNet: false,
      faceExpressionNet: false,
    }
    this.labeledDescriptors = []
    this.detectionOptions = null
    this.recognitionThreshold = 0.6
    this.qualityThreshold = 0.7
  }

  async initialize(progressCallback) {
    try {
      progressCallback?.(0, "Loading face detection model...")

      // Load models sequentially with progress updates
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models")
      this.models.ssdMobilenetv1 = true
      progressCallback?.(25, "Face detection model loaded")

      await faceapi.nets.faceLandmark68Net.loadFromUri("/models")
      this.models.faceLandmark68Net = true
      progressCallback?.(50, "Face landmark model loaded")

      await faceapi.nets.faceRecognitionNet.loadFromUri("/models")
      this.models.faceRecognitionNet = true
      progressCallback?.(75, "Face recognition model loaded")

      await faceapi.nets.faceExpressionNet.loadFromUri("/models")
      this.models.faceExpressionNet = true
      progressCallback?.(90, "Face expression model loaded")

      // Set detection options
      this.detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5,
        maxResults: 10,
      })

      // Load existing face descriptors
      await this.loadFaceDescriptors()

      this.isInitialized = true
      progressCallback?.(100, "Face recognition system ready")

      await db.logActivity("info", "Face recognition engine initialized successfully")
      return true
    } catch (error) {
      await db.logActivity("error", `Face recognition initialization failed: ${error.message}`)
      throw new Error(`Face recognition initialization failed: ${error.message}`)
    }
  }

  async loadFaceDescriptors() {
    try {
      const descriptors = await db.getFaceDescriptors()
      const users = await db.getAllUsers()

      this.labeledDescriptors = []

      for (const user of users) {
        const userDescriptors = descriptors.filter((d) => d.userId === user.id)

        if (userDescriptors.length > 0) {
          const faceDescriptors = userDescriptors.map((d) => new Float32Array(d.descriptor))

          this.labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(user.id.toString(), faceDescriptors))
        }
      }

      console.log(`Loaded ${this.labeledDescriptors.length} labeled face descriptors`)
    } catch (error) {
      console.error("Failed to load face descriptors:", error)
      throw error
    }
  }

  async detectFaces(input, options = {}) {
    if (!this.isInitialized) {
      throw new Error("Face recognition engine not initialized")
    }

    try {
      const detections = await faceapi
        .detectAllFaces(input, this.detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions()

      // Filter by quality if specified
      if (options.minQuality) {
        return detections.filter((detection) => this.calculateFaceQuality(detection) >= options.minQuality)
      }

      return detections
    } catch (error) {
      await db.logActivity("error", `Face detection failed: ${error.message}`)
      throw error
    }
  }

  async recognizeFaces(detections) {
    if (!this.isInitialized) {
      throw new Error("Face recognition engine not initialized")
    }

    if (this.labeledDescriptors.length === 0) {
      return []
    }

    try {
      const faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, this.recognitionThreshold)

      const results = []

      for (const detection of detections) {
        const match = faceMatcher.findBestMatch(detection.descriptor)

        const result = {
          detection,
          match,
          confidence: 1 - match.distance,
          isMatch: match.label !== "unknown",
          userId: match.label !== "unknown" ? Number.parseInt(match.label) : null,
          quality: this.calculateFaceQuality(detection),
          timestamp: new Date().toISOString(),
        }

        results.push(result)
      }

      return results.sort((a, b) => b.confidence - a.confidence)
    } catch (error) {
      await db.logActivity("error", `Face recognition failed: ${error.message}`)
      throw error
    }
  }

  calculateFaceQuality(detection) {
    try {
      // Calculate quality based on multiple factors
      const landmarks = detection.landmarks
      const expressions = detection.expressions

      // Face size quality (larger faces are generally better)
      const faceBox = detection.detection.box
      const faceArea = faceBox.width * faceBox.height
      const sizeQuality = Math.min(faceArea / 40000, 1) // Normalize to max area

      // Landmark quality (check if landmarks are well-defined)
      const landmarkQuality = landmarks ? 0.8 : 0.3

      // Expression quality (neutral expressions are better for recognition)
      let expressionQuality = 0.5
      if (expressions) {
        const neutral = expressions.neutral || 0
        const happy = expressions.happy || 0
        expressionQuality = Math.max(neutral, happy * 0.8)
      }

      // Detection confidence
      const confidenceQuality = detection.detection.score

      // Combined quality score
      const overallQuality =
        sizeQuality * 0.3 + landmarkQuality * 0.2 + expressionQuality * 0.2 + confidenceQuality * 0.3

      return Math.min(Math.max(overallQuality, 0), 1)
    } catch (error) {
      console.warn("Quality calculation failed:", error)
      return 0.5 // Default quality
    }
  }

  async enrollFace(userId, faceDescriptor, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error("Face recognition engine not initialized")
    }

    try {
      // Validate descriptor
      if (!faceDescriptor || faceDescriptor.length !== 128) {
        throw new Error("Invalid face descriptor")
      }

      // Store in database
      const descriptorId = await db.addFaceDescriptor(userId, faceDescriptor, metadata)

      // Reload descriptors to include the new one
      await this.loadFaceDescriptors()

      await db.logActivity("info", `Face enrolled for user ${userId}`, {
        descriptorId,
        metadata,
      })

      return descriptorId
    } catch (error) {
      await db.logActivity("error", `Face enrollment failed: ${error.message}`, { userId })
      throw error
    }
  }

  async validateEnrollmentQuality(detection) {
    const quality = this.calculateFaceQuality(detection)

    const validation = {
      isValid: quality >= this.qualityThreshold,
      quality,
      issues: [],
    }

    if (quality < this.qualityThreshold) {
      if (detection.detection.score < 0.8) {
        validation.issues.push("Low face detection confidence")
      }

      const faceBox = detection.detection.box
      if (faceBox.width < 100 || faceBox.height < 100) {
        validation.issues.push("Face too small - move closer to camera")
      }

      if (!detection.landmarks) {
        validation.issues.push("Face landmarks not detected clearly")
      }

      if (detection.expressions) {
        const neutral = detection.expressions.neutral || 0
        if (neutral < 0.3) {
          validation.issues.push("Please maintain a neutral expression")
        }
      }
    }

    return validation
  }

  drawDetections(canvas, detections, options = {}) {
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const detection of detections) {
      const box = detection.detection.box
      const quality = this.calculateFaceQuality(detection)

      // Draw bounding box
      ctx.strokeStyle = quality >= this.qualityThreshold ? "#00ff88" : "#ff6b6b"
      ctx.lineWidth = 3
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      // Draw quality indicator
      if (options.showQuality) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
        ctx.fillRect(box.x, box.y - 30, 120, 25)

        ctx.fillStyle = "#ffffff"
        ctx.font = "14px Arial"
        ctx.fillText(`Quality: ${(quality * 100).toFixed(0)}%`, box.x + 5, box.y - 10)
      }

      // Draw landmarks if available
      if (options.showLandmarks && detection.landmarks) {
        ctx.fillStyle = "#ff6b6b"
        const landmarks = detection.landmarks.positions

        for (const point of landmarks) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
          ctx.fill()
        }
      }
    }
  }

  drawRecognitionResults(canvas, results, users) {
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const result of results) {
      const box = result.detection.detection.box
      const isMatch = result.isMatch && result.confidence >= this.recognitionThreshold

      // Draw bounding box
      ctx.strokeStyle = isMatch ? "#00ff88" : "#ff6b6b"
      ctx.lineWidth = 3
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      // Draw recognition result
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(box.x, box.y - 60, Math.max(200, box.width), 55)

      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 16px Arial"

      if (isMatch) {
        const user = users.find((u) => u.id === result.userId)
        const name = user ? user.name : "Unknown User"
        ctx.fillText(name, box.x + 5, box.y - 35)

        ctx.font = "12px Arial"
        ctx.fillText(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, box.x + 5, box.y - 20)
        ctx.fillText(`Quality: ${(result.quality * 100).toFixed(0)}%`, box.x + 5, box.y - 5)
      } else {
        ctx.fillText("Unknown Person", box.x + 5, box.y - 35)
        ctx.font = "12px Arial"
        ctx.fillText(`Confidence: ${(result.confidence * 100).toFixed(1)}%`, box.x + 5, box.y - 20)
      }
    }
  }

  getSystemInfo() {
    return {
      isInitialized: this.isInitialized,
      modelsLoaded: this.models,
      labeledDescriptors: this.labeledDescriptors.length,
      recognitionThreshold: this.recognitionThreshold,
      qualityThreshold: this.qualityThreshold,
      version: "1.0.0",
    }
  }
}

// Global face recognition instance
const faceEngine = new FaceRecognitionEngine()
