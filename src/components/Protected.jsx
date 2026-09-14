import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="pulse-dot" />
      </div>
    );
  }
  if (!user) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  return children;
}