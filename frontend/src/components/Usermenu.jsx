import React, { useState, useRef, useEffect } from "react";

export default function UserMenu({ user, logout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex items-center gap-3 font-['Inter',_sans-serif]" ref={menuRef}>
      {/* Welcome Text */}
      <div className="hidden lg:block text-right">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
          Welcome back,
        </p>
        <p className="text-sm font-semibold text-teal-900 leading-tight">
          {user?.username}
        </p>
      </div>

 {/* Profile Trigger */}
<button
  onClick={() => setIsOpen(!isOpen)}
  className="flex-shrink-0 flex items-center justify-center h-10 w-10 aspect-square rounded-full bg-white border border-gray-200 shadow-sm hover:border-teal-500 hover:shadow-md transition-all overflow-hidden focus:outline-none"
>
  {user?.profile_picture ? (
    <img 
      src={user.profile_picture} 
      alt="Profile" 
      className="h-full w-full object-cover rounded-full" 
    />
  ) : (
    <div className="h-full w-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center rounded-full">
      <span className="text-white text-sm font-bold uppercase font-['Inter']">
        {user?.username?.charAt(0) || "U"}
      </span>
    </div>
  )}
</button>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl py-2 border border-gray-100 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-gray-50 md:hidden">
            <p className="text-sm font-bold text-gray-900 truncate">
              {user?.username}
            </p>
          </div>
          
          <div className="py-1">
            <a
              href="/profile/"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              My Profile
            </a>
            
           
          </div>

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 font-semibold hover:bg-red-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}