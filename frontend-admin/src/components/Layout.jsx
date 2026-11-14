import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen ">
      <Sidebar
        open={sidebarExpanded}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <TopBar
          sidebarExpanded={sidebarExpanded}
          onToggleSidebar={() => setSidebarExpanded((expanded) => !expanded)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((open) => !open)}
        />
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
