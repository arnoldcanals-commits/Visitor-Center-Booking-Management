import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api';
import { Bell, BellDot, CheckCheck, Info, Calendar, FileText, AlertCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

// itemsPerPage is now a prop so any parent can control the page size,
// but it still defaults to 5 if nothing is passed in.
const NotificationBell = ({ itemsPerPage: initialItemsPerPage = 5, pageSizeOptions = [5, 10, 20] }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage); // adjustable at runtime too
  const dropdownRef = useRef(null);

  const getIcon = (type) => {
    switch (type) {
      case 'booking': return <Calendar size={18} className="text-blue-500" />;
      case 'permit': return <FileText size={18} className="text-green-500" />;
      case 'system': return <Info size={18} className="text-purple-500" />;
      default: return <AlertCircle size={18} className="text-gray-500" />;
    }
  };

  // Unread first, then newest first within each group (unread and read).
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      // is_read: false (unread) should sort before true (read)
      if (a.is_read !== b.is_read) {
        return a.is_read ? 1 : -1;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [notifications]);

  const totalPages = Math.max(1, Math.ceil(sortedNotifications.length / itemsPerPage));
  const currentItems = sortedNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchNotifications = async () => {
    if (!localStorage.getItem('access')) return;
    try {
      const res = await api.get('/api/notifications/');
      const countRes = await api.get('/api/notifications/unread_count/');
      const data = res.data?.results || res.data || [];
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(countRes.data?.unread_count || 0);
    } catch (err) {
      console.error("Notification Error:", err);
      setNotifications([]);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setLoading(true);
    try {
      await api.post('/api/notifications/mark_all_as_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setCurrentPage(1); // reset since sort order shifts once everything is read
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Reset to page 1 when closed/reopened to avoid confusion
  useEffect(() => {
    if (!isOpen) setCurrentPage(1);
  }, [isOpen]);

  // If page size changes and we'd be stranded past the last page, snap back.
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [itemsPerPage, totalPages, currentPage]);

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

          <div className="min-h-[100px] max-h-[440px] overflow-y-auto">
            {currentItems.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Bell size={40} className="mx-auto mb-2 opacity-10" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              currentItems.map(n => (
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

          {/* Pagination Controls + adjustable page size */}
          {sortedNotifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1 disabled:opacity-30 hover:bg-gray-200 rounded-md transition-colors border-none bg-transparent cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-[11px] text-gray-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="text-[11px] border border-gray-200 rounded-md bg-white text-gray-600 px-4 py-0.5 cursor-pointer"
                >
                  {pageSizeOptions.map(size => (
                    <option key={size} value={size}>{size}/page</option>
                  ))}
                </select>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 disabled:opacity-30 hover:bg-gray-200 rounded-md transition-colors border-none bg-transparent cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;