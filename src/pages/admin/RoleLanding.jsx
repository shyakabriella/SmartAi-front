// src/pages/admin/RoleLanding.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const norm = (s) => (s ?? "").toString().trim().toLowerCase();

const routeForRole = (role) => {
  const map = {
    admin: "/admin",
    manager: "/admin",
    agent: "/admin/agent",
    driver: "/driver",
    customer: "/customer",
  };
  return map[role] || "/login";
};

export default function RoleLanding() {
  const nav = useNavigate();

  useEffect(() => {
    let roles = [];
    try {
      const raw = localStorage.getItem("auth.roles");
      roles = raw ? JSON.parse(raw) : [];
    } catch {}

    // normalize roles: ['Agent'] or [{name:'agent'}]
    const roleNames = Array.isArray(roles)
      ? roles.map((r) => norm(typeof r === "string" ? r : r?.name)).filter(Boolean)
      : [];

    const primary = roleNames[0] || "";
    const dest = routeForRole(primary);

    nav(dest, { replace: true });
  }, [nav]);

  return null; 
}
