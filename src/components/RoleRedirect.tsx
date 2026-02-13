import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

export const RoleRedirect = () => {
  const { role, loading, isOperador } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (role === "mentor" && isOperador) {
    return <Navigate to="/admin" replace />;
  }

  if (role === "mentor") {
    return <Navigate to="/mentor" replace />;
  }

  if (role === "beneficiario") {
    return <Navigate to="/" replace />;
  }

  if (role === "stakeholder") {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/login" replace />;
};
