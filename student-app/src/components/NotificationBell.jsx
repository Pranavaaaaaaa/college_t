import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext.jsx'; // Import the hook

// SVG for the Bell Icon
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.017 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
);

// SVG for the Trash Icon
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9M4.5 9h15M5.25 9v11.25a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5V9M8.25 9.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm2.25 0v7.5m3-7.5v7.5" />
  </svg>
);


function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  // Get the state from our global context
  // clearAll is no longer needed, but we add removeNotification
  const { notifications, hasUnread, markAllAsRead, removeNotification } = useNotifications();

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // When we open the panel, mark all as read
      markAllAsRead();
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation(); // Prevent the click from closing the dropdown
    removeNotification(id);
  };

  return (
    <div className="relative ml-4">
      {/* The Bell Icon Button */}
      <button onClick={handleToggle} className="relative text-gray-300 hover:text-white">
        <BellIcon />
        {/* The Red Dot */}
        {hasUnread && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </button>

      {/* The Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-lg z-20 border text-black"
          // We can remove onMouseLeave if it's annoying, or keep it.
          // For a professional feel, it's better to click outside to close.
          // Let's keep it for now, but this could be improved with a proper click-outside hook.
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex justify-between items-center p-3 border-b">
            <h4 className="font-semibold text-gray-800">Notifications</h4>
            {/* "Clear all" button is removed */}
          </div>

          {/* List of Notifications */}
          <div className="py-1">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center p-4">No new notifications</p>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`px-4 py-3 border-b hover:bg-gray-50 flex items-center justify-between ${!notif.isRead ? 'bg-blue-50' : ''}`}
                >
                  {/* Notification Content */}
                  <div className="flex-grow">
                    <p className="font-semibold text-sm text-gray-800">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.body}</p>
                  </div>
                  {/* Delete Button */}
                  <button 
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100"
                    title="Delete notification"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;