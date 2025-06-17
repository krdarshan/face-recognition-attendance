/**
 * Production Database Manager
 * Handles all data persistence and management
 */
class DatabaseManager {
  constructor() {
    this.dbName = "FaceAttendanceDB"
    this.version = 1
    this.db = null
    this.isInitialized = false
  }

  async initialize() {
    try {
      this.db = await this.openDatabase()
      this.isInitialized = true
      console.log("Database initialized successfully")
      return true
    } catch (error) {
      console.error("Database initialization failed:", error)
      throw new Error(`Database initialization failed: ${error.message}`)
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error("Failed to open database"))
      }

      request.onsuccess = (event) => {
        resolve(event.target.result)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Users store
        if (!db.objectStoreNames.contains("users")) {
          const userStore = db.createObjectStore("users", {
            keyPath: "id",
            autoIncrement: true,
          })
          userStore.createIndex("email", "email", { unique: true })
          userStore.createIndex("name", "name", { unique: false })
          userStore.createIndex("department", "department", { unique: false })
        }

        // Face descriptors store
        if (!db.objectStoreNames.contains("faceDescriptors")) {
          const faceStore = db.createObjectStore("faceDescriptors", {
            keyPath: "id",
            autoIncrement: true,
          })
          faceStore.createIndex("userId", "userId", { unique: false })
        }

        // Attendance records store
        if (!db.objectStoreNames.contains("attendance")) {
          const attendanceStore = db.createObjectStore("attendance", {
            keyPath: "id",
            autoIncrement: true,
          })
          attendanceStore.createIndex("userId", "userId", { unique: false })
          attendanceStore.createIndex("date", "date", { unique: false })
          attendanceStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        // System logs store
        if (!db.objectStoreNames.contains("systemLogs")) {
          const logStore = db.createObjectStore("systemLogs", {
            keyPath: "id",
            autoIncrement: true,
          })
          logStore.createIndex("timestamp", "timestamp", { unique: false })
          logStore.createIndex("level", "level", { unique: false })
        }
      }
    })
  }

  async addUser(userData) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const transaction = this.db.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")

      const user = {
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        totalAttendance: 0,
        lastSeen: null,
      }

      const result = await this.promisifyRequest(store.add(user))
      await this.logActivity("info", `User added: ${user.name}`, { userId: result })

      return result
    } catch (error) {
      await this.logActivity("error", `Failed to add user: ${error.message}`, userData)
      throw error
    }
  }

  async getUser(id) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    const transaction = this.db.transaction(["users"], "readonly")
    const store = transaction.objectStore("users")
    return await this.promisifyRequest(store.get(id))
  }

  async getAllUsers() {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    const transaction = this.db.transaction(["users"], "readonly")
    const store = transaction.objectStore("users")
    return await this.promisifyRequest(store.getAll())
  }

  async updateUser(id, updates) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const user = await this.getUser(id)
      if (!user) {
        throw new Error("User not found")
      }

      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const transaction = this.db.transaction(["users"], "readwrite")
      const store = transaction.objectStore("users")

      await this.promisifyRequest(store.put(updatedUser))
      await this.logActivity("info", `User updated: ${updatedUser.name}`, { userId: id })

      return updatedUser
    } catch (error) {
      await this.logActivity("error", `Failed to update user: ${error.message}`, { userId: id })
      throw error
    }
  }

  async deleteUser(id) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const user = await this.getUser(id)
      if (!user) {
        throw new Error("User not found")
      }

      // Delete user
      const userTransaction = this.db.transaction(["users"], "readwrite")
      await this.promisifyRequest(userTransaction.objectStore("users").delete(id))

      // Delete face descriptors
      const faceTransaction = this.db.transaction(["faceDescriptors"], "readwrite")
      const faceStore = faceTransaction.objectStore("faceDescriptors")
      const faceIndex = faceStore.index("userId")
      const faceDescriptors = await this.promisifyRequest(faceIndex.getAll(id))

      for (const descriptor of faceDescriptors) {
        await this.promisifyRequest(faceStore.delete(descriptor.id))
      }

      await this.logActivity("info", `User deleted: ${user.name}`, { userId: id })

      return true
    } catch (error) {
      await this.logActivity("error", `Failed to delete user: ${error.message}`, { userId: id })
      throw error
    }
  }

  async addFaceDescriptor(userId, descriptor, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const transaction = this.db.transaction(["faceDescriptors"], "readwrite")
      const store = transaction.objectStore("faceDescriptors")

      const faceData = {
        userId,
        descriptor: Array.from(descriptor), // Convert Float32Array to regular array
        metadata,
        createdAt: new Date().toISOString(),
      }

      const result = await this.promisifyRequest(store.add(faceData))
      await this.logActivity("info", `Face descriptor added for user ${userId}`, { descriptorId: result })

      return result
    } catch (error) {
      await this.logActivity("error", `Failed to add face descriptor: ${error.message}`, { userId })
      throw error
    }
  }

  async getFaceDescriptors(userId = null) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    const transaction = this.db.transaction(["faceDescriptors"], "readonly")
    const store = transaction.objectStore("faceDescriptors")

    if (userId) {
      const index = store.index("userId")
      return await this.promisifyRequest(index.getAll(userId))
    } else {
      return await this.promisifyRequest(store.getAll())
    }
  }

  async addAttendanceRecord(userId, confidence, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const now = new Date()
      const transaction = this.db.transaction(["attendance", "users"], "readwrite")

      // Add attendance record
      const attendanceStore = transaction.objectStore("attendance")
      const attendanceRecord = {
        userId,
        timestamp: now.toISOString(),
        date: now.toISOString().split("T")[0],
        time: now.toTimeString().split(" ")[0],
        confidence,
        metadata,
        createdAt: now.toISOString(),
      }

      const attendanceId = await this.promisifyRequest(attendanceStore.add(attendanceRecord))

      // Update user's last seen and total attendance
      const userStore = transaction.objectStore("users")
      const user = await this.promisifyRequest(userStore.get(userId))

      if (user) {
        user.lastSeen = now.toISOString()
        user.totalAttendance = (user.totalAttendance || 0) + 1
        user.updatedAt = now.toISOString()
        await this.promisifyRequest(userStore.put(user))
      }

      await this.logActivity("info", `Attendance recorded for user ${userId}`, {
        attendanceId,
        confidence,
      })

      return attendanceId
    } catch (error) {
      await this.logActivity("error", `Failed to record attendance: ${error.message}`, { userId })
      throw error
    }
  }

  async getAttendanceRecords(filters = {}) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    const transaction = this.db.transaction(["attendance"], "readonly")
    const store = transaction.objectStore("attendance")

    let records = await this.promisifyRequest(store.getAll())

    // Apply filters
    if (filters.userId) {
      records = records.filter((record) => record.userId === filters.userId)
    }

    if (filters.date) {
      records = records.filter((record) => record.date === filters.date)
    }

    if (filters.startDate && filters.endDate) {
      records = records.filter((record) => record.date >= filters.startDate && record.date <= filters.endDate)
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return records
  }

  async getTodayAttendance() {
    const today = new Date().toISOString().split("T")[0]
    return await this.getAttendanceRecords({ date: today })
  }

  async logActivity(level, message, data = {}) {
    if (!this.isInitialized) {
      console.log(`[${level.toUpperCase()}] ${message}`, data)
      return
    }

    try {
      const transaction = this.db.transaction(["systemLogs"], "readwrite")
      const store = transaction.objectStore("systemLogs")

      const logEntry = {
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }

      await this.promisifyRequest(store.add(logEntry))
    } catch (error) {
      console.error("Failed to log activity:", error)
    }
  }

  async getSystemLogs(filters = {}) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    const transaction = this.db.transaction(["systemLogs"], "readonly")
    const store = transaction.objectStore("systemLogs")

    let logs = await this.promisifyRequest(store.getAll())

    if (filters.level) {
      logs = logs.filter((log) => log.level === filters.level)
    }

    if (filters.limit) {
      logs = logs.slice(0, filters.limit)
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  async exportData() {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const [users, attendance, logs] = await Promise.all([
        this.getAllUsers(),
        this.getAttendanceRecords(),
        this.getSystemLogs({ limit: 1000 }),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        version: this.version,
        data: {
          users,
          attendance,
          logs,
        },
      }

      return exportData
    } catch (error) {
      await this.logActivity("error", `Failed to export data: ${error.message}`)
      throw error
    }
  }

  async clearAllData() {
    if (!this.isInitialized) {
      throw new Error("Database not initialized")
    }

    try {
      const transaction = this.db.transaction(["users", "faceDescriptors", "attendance", "systemLogs"], "readwrite")

      await Promise.all([
        this.promisifyRequest(transaction.objectStore("users").clear()),
        this.promisifyRequest(transaction.objectStore("faceDescriptors").clear()),
        this.promisifyRequest(transaction.objectStore("attendance").clear()),
        this.promisifyRequest(transaction.objectStore("systemLogs").clear()),
      ])

      await this.logActivity("warning", "All data cleared from database")

      return true
    } catch (error) {
      await this.logActivity("error", `Failed to clear data: ${error.message}`)
      throw error
    }
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// Global database instance
const db = new DatabaseManager()
