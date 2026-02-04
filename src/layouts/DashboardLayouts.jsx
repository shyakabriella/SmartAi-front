// src/layouts/DashboardLayouts.jsx
import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Nav from "../components/dashboard/Nav";
// import Right from "../components/dashboard/Right"; // ❌ remove

export default function DashboardLayouts() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />

        {/* Main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Nav
            collapsed={collapsed}
            onToggleSidebar={() => setCollapsed((v) => !v)}
            // rightOpen={false}            // ❌ remove if Nav expects it
            // onToggleRight={() => {}}     // ❌ remove if Nav expects it
          />

          <main className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>

        {/* ❌ Right panel removed */}
      </div>
    </div>
  );
}