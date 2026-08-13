import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/axios';

const NotificationContext = createContext(undefined);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const normalizeText = (value) => {
    if (value == null) return '';
    if (typeof value === 'object') {
      try {
        const serialized = JSON.stringify(value);
        return serialized && serialized !== '[object Object]' ? serialized : '';
      } catch {
        return '';
      }
    }
    const stringValue = String(value ?? '');
    return stringValue && stringValue !== '[object Object]' ? stringValue : '';
  };

  const normalizeNotification = (n) => ({
    id: n.id ?? n.ID,
    user_id: n.user_id ?? n.USER_ID,
    type: n.type ?? n.TYPE,
    title: normalizeText(n.title ?? n.TITLE),
    message: normalizeText(n.message ?? n.MESSAGE),
    link: normalizeText(n.link ?? n.LINK),
    is_read: n.is_read != null ? Boolean(n.is_read) : Boolean(n.IS_READ),
    created_at: n.created_at ?? n.CREATED_AT,
  });

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const queryParams = user?.role === 'ADMIN' ? '?all=true' : '';
      const res = await api.get(`/notifications${queryParams}`);
      const notificationsData = (res.data || []).map(normalizeNotification);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) { // ✅ FIXED
      setNotifications([]);
      return;
    }

    fetchNotifications();

    // ✅ FIXED WebSocket URL (use backend, NOT Vite frontend)
    const ws = new WebSocket(`ws://localhost:3000/?userId=${user.id}`);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'NOTIFICATION') {
        setNotifications(prev => [normalizeNotification(message.data), ...prev]);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return () => ws.close();
  }, [user, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return; // ✅ FIXED

    try {
      await api.patch('/notifications/read-all', { userId: user.id });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    if (!id) return;

    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;

    try {
      await api.delete('/notifications', { data: { userId: user.id } });
      setNotifications([]);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
}