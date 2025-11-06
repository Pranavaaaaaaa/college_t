import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Storage key
const NOTIFICATION_STORAGE_KEY = 'busAppNotifications';

// Create the context
const NotificationContext = createContext();

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Helper function to load from localStorage
const loadInitialState = () => {
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check for unread notifications on load
      const hasUnread = parsed.some(notif => !notif.isRead);
      return { initialNotifications: parsed, initialHasUnread: hasUnread };
    }
  } catch (err) {
    console.error("Failed to load notifications from storage", err);
  }
  return { initialNotifications: [], initialHasUnread: false };
};

// Provider component
export const NotificationProvider = ({ children }) => {
  const { initialNotifications, initialHasUnread } = loadInitialState();
  
  const [notifications, setNotifications] = useState(initialNotifications);
  const [hasUnread, setHasUnread] = useState(initialHasUnread);

  // Effect to save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    } catch (err) {
      console.error("Failed to save notifications to storage", err);
    }
  }, [notifications]);

  // Add a new notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(), // Simple unique ID
      title: notification.title || 'Notification',
      body: notification.body || '',
      isRead: false,
      timestamp: new Date().toISOString() // Use ISO string for consistency
    };

    setNotifications(prev => [newNotification, ...prev]);
    setHasUnread(true);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notif => (notif.isRead ? notif : { ...notif, isRead: true }))
    );
    setHasUnread(false);
  }, []);

  // Remove a specific notification
  const removeNotification = useCallback((id) => {
    let unreadCount = 0;
    const newNotifications = notifications.filter(notif => {
      if (notif.id === id) return false; // Remove it
      if (!notif.isRead) unreadCount++; // Check others
      return true;
    });

    setNotifications(newNotifications);
    // Update hasUnread only if the removed item was the *last* unread one
    if (hasUnread && unreadCount === 0) {
      setHasUnread(false);
    }
  }, [notifications, hasUnread]);


  const value = {
    notifications,
    hasUnread,
    addNotification,
    markAllAsRead,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};