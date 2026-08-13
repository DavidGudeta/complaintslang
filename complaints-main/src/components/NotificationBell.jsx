import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink, Clock, AlertCircle, UserPlus, MessageSquare, Info, Trash2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../types';
import { formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case NotificationType.NEW_COMPLAINT: return <AlertCircle className="text-sky-600" size={18} />;
      case NotificationType.ASSIGNMENT: return <UserPlus className="text-emerald-600" size={18} />;
      case NotificationType.STATUS_UPDATE: return <Clock className="text-amber-600" size={18} />;
      case NotificationType.NEW_RESPONSE: return <MessageSquare className="text-purple-600" size={18} />;
      case NotificationType.DEADLINE_REMINDER: return <AlertCircle className="text-red-600" size={18} />;
      default: return <Info className="text-sky-600" size={18} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-sky-400 hover:text-sky-900 hover:bg-sky-50 rounded-xl transition-all"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl shadow-sky-200/50 border border-sky-100 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/50 gap-2">
              <h3 className="font-bold text-sky-900">Notifications</h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  >
                    <Check size={14} /> Mark all as read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={() => clearAllNotifications()}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Clear All
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-sky-50">
                  {notifications.map((n, index) => (
                    <div
                      key={n.id ?? index}
                      className={cn(
                        "p-4 hover:bg-sky-50 transition-colors cursor-pointer relative group",
                        !n.is_read && "bg-sky-50/30"
                      )}
                      onClick={() => !n.is_read && n.id != null && markAsRead(n.id)}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1 shrink-0">
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm mb-1", !n.is_read ? "font-bold text-sky-900" : "text-sky-600")}>
                            {n.title}
                          </p>
                          <p className="text-xs text-sky-500 line-clamp-2 mb-2">
                            {(() => {
                              let displayMessage = '';
                              if (typeof n.message === 'object' && n.message !== null) {
                                displayMessage = JSON.stringify(n.message);
                              } else {
                                displayMessage = String(n.message ?? '');
                              }
                              return displayMessage === '[object Object]' ? '' : displayMessage;
                            })()}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-sky-400 font-medium">
                              {formatDate(n.created_at)}
                            </span>
                            <div className="flex items-center gap-2">
                              {n.link && (
                                <Link
                                  to={n.link}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setIsOpen(false);
                                  }}
                                  className="text-[10px] font-bold text-sky-600 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  View <ExternalLink size={10} />
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteNotification(n.id);
                                }}
                                className="text-[10px] font-bold text-rose-600 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Delete <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {!n.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-600" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4 text-sky-300">
                    <Bell size={24} />
                  </div>
                  <p className="text-sm text-sky-400 font-medium">No notifications yet</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-sky-50/50 border-t border-sky-100 text-center">
              <button className="text-xs font-bold text-sky-500 hover:text-sky-900 transition-colors">
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
