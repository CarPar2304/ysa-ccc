import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import News from "./pages/News";
import Lab from "./pages/Lab";
import LabModuleView from "./pages/LabModuleView";
import LabClassView from "./pages/LabClassView";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import MentorPanel from "./pages/MentorPanel";
import Mentorias from "./pages/Mentorias";
import RegisterMentor from "./pages/RegisterMentor";
import NotFound from "./pages/NotFound";
import Estudiantes from "./pages/Estudiantes";
import Candidatos from "./pages/Candidatos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register-mentor" element={<RegisterMentor />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
        <Route path="/lab" element={<ProtectedRoute><Lab /></ProtectedRoute>} />
        <Route path="/lab/:moduloId" element={<ProtectedRoute><LabModuleView /></ProtectedRoute>} />
        <Route path="/lab/:moduloId/:claseId" element={<ProtectedRoute><LabClassView /></ProtectedRoute>} />
        <Route path="/mentorias" element={<ProtectedRoute><Mentorias /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/candidatos" element={<ProtectedRoute><Candidatos /></ProtectedRoute>} />
        <Route path="/estudiantes" element={<ProtectedRoute><Estudiantes /></ProtectedRoute>} />
        <Route path="/mentor" element={<ProtectedRoute><MentorPanel /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
