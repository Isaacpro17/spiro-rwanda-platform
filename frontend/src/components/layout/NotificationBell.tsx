import { useState, useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

interface Notification {
  _id: string
  messageContent: string
  messageKey: string
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get<any>('/notifications?limit=20')
      if (res && res.notifications) {
        setNotifications(res.notifications)
        setUnreadCount(res.unreadCount)
      }
    } catch (err) {
      console.error('Failed to load notifications', err)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleDropdown = async () => {
    const newIsOpen = !isOpen
    setIsOpen(newIsOpen)
    
    // Mark as read when opening if there are unread
    if (newIsOpen && unreadCount > 0) {
      try {
        await api.put('/notifications/read-all', {})
        setUnreadCount(0)
        setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })))
      } catch (err) {
        console.error('Failed to mark notifications as read', err)
      }
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="text-gray-500 hover:text-gray-700 relative p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
          <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-xs text-gray-500">{notifications.length} recent</span>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm flex flex-col items-center">
                <Bell className="w-8 h-8 text-gray-300 mb-2" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div 
                    key={notif._id} 
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-primary-50/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                      <div>
                        <p className={`text-sm text-gray-800 ${!notif.isRead ? 'font-medium' : ''}`}>
                          {notif.messageContent || notif.messageKey}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notif.createdAt).toLocaleString(undefined, {
                            hour: 'numeric', minute: 'numeric', 
                            month: 'short', day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
