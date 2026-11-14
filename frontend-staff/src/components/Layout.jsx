import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="flex h-screen">
      <Sidebar sidebarExpanded={sidebarExpanded} />

      <div className="flex flex-col flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <TopBar
          sidebarExpanded={sidebarExpanded}
          onToggleSidebar={() => setSidebarExpanded((expanded) => !expanded)}
        />
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
