import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-auto bg-gray-50">
        <TopBar />
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
