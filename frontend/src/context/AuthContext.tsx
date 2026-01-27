import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile } from "../services/user";
import { useNavigate } from "react-router-dom";
import axios from "axios";

type AuthContextType = {
  email: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const profile = await getProfile();
      setEmail(profile.email);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setEmail(null);
        navigate("/login");
      } else {
        console.error("Error fetching profile:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        email,
        loading,
        isAuthenticated: !!email,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};



export const useProtectedRoute = () => {
  const navigate = useNavigate();
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useProtectedRoute must be used within an AuthProvider");
  }

  const { isAuthenticated, loading } = context;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return context;
};
