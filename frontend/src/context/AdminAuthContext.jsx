import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { adminMe, adminLogout as apiAdminLogout, adminAuthSession } from "@/lib/api";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const processed = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const a = await adminMe();
      setAdmin(a);
    } catch (e) {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const hash = window.location.hash || "";
    if (hash.includes("session_id=")) {
      if (processed.current) return;
      processed.current = true;
      const sid = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
      (async () => {
        try {
          const res = await adminAuthSession(sid);
          setAdmin(res.admin);
        } catch (e) {
          setAdmin(null);
        } finally {
          window.history.replaceState(null, "", window.location.pathname);
          setLoading(false);
        }
      })();
      return;
    }
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiAdminLogout();
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, setAdmin, refresh, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
