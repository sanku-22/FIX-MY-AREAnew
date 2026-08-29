import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();

  useEffect(() => {
    if (!loading && admin) navigate("/admin");
  }, [loading, admin, navigate]);

  const signIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/admin";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0f1417]">
        <Loader2 className="h-6 w-6 animate-spin text-[#5fd0c5]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0f1417] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#243036] bg-[#151c21] p-8 text-white shadow-2xl">
        <button data-testid="admin-back-home" onClick={() => navigate("/")} className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-[#8aa0a8] hover:text-[#5fd0c5]">
          <ArrowLeft className="h-4 w-4" /> Back to Fix My Area
        </button>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f7a72]"><ShieldCheck className="h-6 w-6" /></span>
          <div>
            <h1 className="font-heading text-xl font-extrabold">Fix My Area — Admin</h1>
            <p className="text-xs text-[#8aa0a8]">For government officials & contractors</p>
          </div>
        </div>

        <p className="mt-6 text-sm text-[#8aa0a8]">
          Sign in with your Google account. New admins complete a short profile and are activated after super-admin approval.
        </p>

        <button data-testid="admin-google-signin" onClick={signIn} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white py-3.5 text-sm font-bold text-[#1a1a1a] transition-transform hover:scale-[1.01]">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
