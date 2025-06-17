/**
 * Mock Database Manager for Development
 * This is a simplified, in-memory database manager for development purposes.
 * It mimics the structure and function of the production DatabaseManager in `database.js`
 */
class MockDatabaseManager {
  constructor() {
    this.users = []
    this.faceDescriptors = []
    this.attendanceRecords = []
    this.systemLogs = []
    this.nextUserId = 1
    this.nextFaceDescriptorId = 1
    this.nextAttendanceId = 1
    this.nextLogId = 1
    this.isInitialized = true // Mock is always initialized
  }

  async initialize() {
    return true // Initialization is immediate for the mock
  }

  async addUser(userData) {
    const user = {
      id: this.nextUserId++,
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      totalAttendance: 0,
      lastSeen: null,
    }
    this.users.push(user)
    await this.logActivity("info", `User added: ${user.name}`, { userId: user.id })
    return user.id
  }

  async getUser(id) {
    return this.users.find((user) => user.id === id)
  }

  async getAllUsers() {
    return [...this.users] // Return a copy to prevent direct modification
  }

  async updateUser(id, updates) {
    const userIndex = this.users.findIndex((user) => user.id === id)
    if (userIndex === -1) {
      throw new Error("User not found")
    }
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await this.logActivity("info", `User updated: ${this.users[userIndex].name}`, { userId: id })
    return this.users[userIndex]
  }

  async deleteUser(id) {
    const userIndex = this.users.findIndex((user) => user.id === id)
    if (userIndex === -1) {
      throw new Error("User not found")
    }
    const user = this.users.splice(userIndex, 1)[0]
    this.faceDescriptors = this.faceDescriptors.filter((fd) => fd.userId !== id)
    this.attendanceRecords = this.attendanceRecords.filter((ar) => ar.userId !== id)
    await this.logActivity("info", `User deleted: ${user.name}`, { userId: id })
    return true
  }

  async addFaceDescriptor(userId, descriptor, metadata = {}) {
    const faceDescriptor = {
      id: this.nextFaceDescriptorId++,
      userId,
      descriptor: Array.from(descriptor),
      metadata,
      createdAt: new Date().toISOString(),
    }
    this.faceDescriptors.push(faceDescriptor)
    await this.logActivity("info", `Face descriptor added for user ${userId}`, { descriptorId: faceDescriptor.id })
    return faceDescriptor.id
  }

  async getFaceDescriptors(userId = null) {
    if (userId) {
      return this.faceDescriptors.filter((fd) => fd.userId === userId)
    }
    return [...this.faceDescriptors]
  }

  async addAttendanceRecord(userId, confidence, metadata = {}) {
    const now = new Date()
    const attendanceRecord = {
      id: this.nextAttendanceId++,
      userId,
      timestamp: now.toISOString(),
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().split(" ")[0],
      confidence,
      metadata,
      createdAt: now.toISOString(),
    }
    this.attendanceRecords.push(attendanceRecord)

    // Update user's last seen and total attendance
    const user = this.users.find((u) => u.id === userId)
    if (user) {
      user.lastSeen = now.toISOString()
      user.totalAttendance = (user.totalAttendance || 0) + 1
      user.updatedAt = now.toISOString()
    }

    await this.logActivity("info", `Attendance recorded for user ${userId}`, {
      attendanceId: attendanceRecord.id,
      confidence,
    })
    return attendanceRecord.id
  }

  async getAttendanceRecords(filters = {}) {
    let records = [...this.attendanceRecords]

    if (filters.userId) {
      records = records.filter((record) => record.userId === filters.userId)
    }

    if (filters.date) {
      records = records.filter((record) => record.date === filters.date)
    }

    if (filters.startDate && filters.endDate) {
      records = records.filter((record) => record.date >= filters.startDate && record.date <= filters.endDate)
    }

    return records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  async getTodayAttendance() {
    const today = new Date().toISOString().split("T")[0]
    return await this.getAttendanceRecords({ date: today })
  }

  async logActivity(level, message, data = {}) {
    const logEntry = {
      id: this.nextLogId++,
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userAgent: "Mock User Agent",
      url: "Mock URL",
    }
    this.systemLogs.push(logEntry)
    console.log(`[${level.toUpperCase()}] ${message}`, data)
  }

  async getSystemLogs(filters = {}) {
    let logs = [...this.systemLogs]

    if (filters.level) {
      logs = logs.filter((log) => log.level === filters.level)
    }

    if (filters.limit) {
      logs = logs.slice(0, filters.limit)
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  async exportData() {
    return {
      exportDate: new Date().toISOString(),
      version: "Mock Version",
      data: {
        users: [...this.users],
        attendance: [...this.attendanceRecords],
        logs: [...this.systemLogs],
      },
    }
  }

  async clearAllData() {
    this.users = []
    this.faceDescriptors = []
    this.attendanceRecords = []
    this.systemLogs = []
    this.nextUserId = 1
    this.nextFaceDescriptorId = 1
    this.nextAttendanceId = 1
    this.nextLogId = 1
    await this.logActivity("warning", "All data cleared from database")
    return true
  }

  promisifyRequest(result) {
    return new Promise((resolve) => resolve(result))
  }
}

const db = new MockDatabaseManager()

export default db
