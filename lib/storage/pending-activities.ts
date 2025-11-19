/**
 * Local Storage Manager for Pending Activities
 * Ensures activities are saved locally until confirmed by Supabase
 */

export interface PendingActivity {
  id: string // Temporary local ID
  user_id: string
  activity_text: string
  logged_at: string
  created_at: string
  status: 'pending' | 'confirmed' | 'failed'
  retryCount: number
}

const STORAGE_KEY = 'time_audit_pending_activities'
const MAX_RETRIES = 3

export class PendingActivityStorage {
  /**
   * Save activity to local storage before sending to Supabase
   */
  static addPending(activity: Omit<PendingActivity, 'status' | 'retryCount'>): void {
    const pending = this.getAll()
    pending.push({
      ...activity,
      status: 'pending',
      retryCount: 0
    })
    this.save(pending)
  }

  /**
   * Mark activity as confirmed after successful Supabase insert
   */
  static markConfirmed(localId: string): void {
    const pending = this.getAll()
    const activity = pending.find(a => a.id === localId)
    if (activity) {
      activity.status = 'confirmed'
      this.save(pending)
    }
  }

  /**
   * Mark activity as failed and increment retry count
   */
  static markFailed(localId: string): void {
    const pending = this.getAll()
    const activity = pending.find(a => a.id === localId)
    if (activity) {
      activity.status = 'failed'
      activity.retryCount += 1
      this.save(pending)
    }
  }

  /**
   * Get all pending activities that need to be synced
   */
  static getPending(): PendingActivity[] {
    return this.getAll().filter(
      a => a.status === 'pending' || (a.status === 'failed' && a.retryCount < MAX_RETRIES)
    )
  }

  /**
   * Get all activities (for optimistic UI)
   */
  static getAll(): PendingActivity[] {
    if (typeof window === 'undefined') return []

    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  }

  /**
   * Remove old confirmed activities (cleanup)
   */
  static cleanup(): void {
    const pending = this.getAll()
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    // Keep only: recent confirmed activities, pending activities, and failed activities under retry limit
    const filtered = pending.filter(activity => {
      if (activity.status === 'confirmed') {
        return new Date(activity.created_at).getTime() > oneDayAgo
      }
      if (activity.status === 'failed') {
        return activity.retryCount < MAX_RETRIES
      }
      return true // Keep all pending
    })

    this.save(filtered)
  }

  /**
   * Save activities to localStorage
   */
  private static save(activities: PendingActivity[]): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities))
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  }

  /**
   * Clear all (for testing/debugging)
   */
  static clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }
}
