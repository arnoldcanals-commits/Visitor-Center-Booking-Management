import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import api from '../api'; 

import { AuthContext } from '../contexts/AuthContext';
import { Bell, BellDot, CheckCheck, Info, Calendar, FileText, AlertCircle, Loader2 } from 'lucide-react';

const NotificationBell = () => {
  // 1. Hook into AuthContext
  const { user, authTokens } = useContext(AuthContext);
  
  const [notifications, setNotifications] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const getIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar size={18} className="text-blue-500" />;
      case 'permit': return <FileText size={18} className="text-green-500" />;
      case 'system': return <Info size={18} className="text-purple-500" />;
      default: return <AlertCircle size={18} className="text-gray-500" />;
    }
  };

  // 2. Wrap fetch in useCallback to prevent unnecessary re-renders
  const fetchNotifications = useCallback(async () => {
    // Only fetch if we have a user and a token
    if (!user || !authTokens?.access) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    try {
      const res = await api.get('/api/notifications/');
      const countRes = await api.get('/api/notifications/unread_count/');
      
      const data = res.data?.results || res.data || [];
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(countRes.data?.unread_count || 0);
    } catch (err) {
      console.error("Notification Error:", err);
      // Optional: Clear notifications on 401/Unauthorized
      if (err.response?.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
      }
    }
  }, [user, authTokens]); // Re-create function if user changes

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await api.post('/api/notifications/mark_all_as_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id, isAlreadyRead) => {
    if (isAlreadyRead) return;
    try {
      await api.post(`/api/notifications/${id}/mark_as_read/`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  // Click outside logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Effect triggers on mount and whenever the user/auth status changes
  useEffect(() => {
    fetchNotifications();
    
    // Only set interval if user is logged in
    let interval;
    if (user) {
      interval = setInterval(fetchNotifications, 60000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchNotifications, user]);

  // Don't render anything if the user isn't logged in
  if (!user) return null;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
      >
        {unreadCount > 0 ? <BellDot size={22} className="text-teal-600" /> : <Bell size={22} />}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <span className="font-bold text-gray-800 text-sm">Notifications</span>
            <button 
                onClick={markAllAsRead}
                disabled={loading || unreadCount === 0}
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium bg-transparent border-none cursor-pointer disabled:opacity-30"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              Mark all read
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Bell size={40} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => markAsRead(n.id, n.is_read)}
                  className={`flex gap-3 p-4 border-b border-gray-50 transition-all ${
                    n.is_read ? 'bg-white opacity-70' : 'bg-teal-50/30 hover:bg-teal-50'
                  } cursor-pointer`}
                >
                  <div className="mt-1">{getIcon(n.notification_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${n.is_read ? 'text-gray-600' : 'font-bold text-gray-900'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{n.created_at_formatted}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0" />}
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 text-center bg-gray-50 border-t border-gray-100">
            <button className="text-xs text-gray-500 hover:text-teal-600 font-semibold bg-transparent border-none cursor-pointer uppercase tracking-wider">
              See All Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;