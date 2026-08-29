import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MapHome from "@/pages/MapHome";
import IssueDetail from "@/pages/IssueDetail";
import MyIssues from "@/pages/MyIssues";
import AdminLogin from "@/pages/AdminLogin";
import AdminPortal from "@/pages/AdminPortal";
import BottomNav from "@/components/BottomNav";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapHome />} />
          <Route path="/issue/:id" element={<IssueDetail />} />
          <Route path="/my-issues" element={<MyIssues />} />
          <Route path="/admin-login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
          <Route path="/admin" element={<AdminAuthProvider><AdminPortal /></AdminAuthProvider>} />
        </Routes>
        <BottomNav />
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </div>
    </ThemeProvider>
  );
}

export default App;
