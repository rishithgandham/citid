import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile } from "../services/user";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { logout } from "../services/auth";

type AuthContextType = {
  email: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


// AuthContext provides the authentication state to the app. It is wrapped around the router component in main.tsx
// It provides the email + other user information, loading state, and authentication status, and refresh profile function
// It also provides the logoutUser function to logout the user
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  // Email + other user information
  const [email, setEmail] = useState<string | null>(null);


  // Loading state, true until the profile is fetched
  const [loading, setLoading] = useState(true);

  // Refresh the profile when the component mounts, to check if the user is authenticated, 
  // called in the effect and can be called manually to refresh the profile, updating the 
  // auth state for all components that use the AuthContext
  const refreshProfile = async () => {
    try {
      const profile = await getProfile();
      setEmail(profile.email);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setEmail(null);
      } else {
        console.error("Error fetching profile:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Logout the user by calling the logout function, navigating to the login page, and setting the email to null
  const logoutUser = async () => {
    try {
      await logout();
      setEmail(null);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }

  // Refresh the profile when the component mounts, to check if the user is authenticated
  useEffect(() => {
    refreshProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        email,
        loading,
        isAuthenticated: !!email,
        refreshProfile,
        logoutUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// useAuth is a hook that provides the authentication state to the app. It is used in the components that need to access the authentication state
// It returns the authentication state it gets from the useContext hook.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};



// useProtectedRoute is a hook that protects routes from unauthorized access. It is used in the components that need to access the authentication state
// It returns the authentication state it gets from the useContext hook, and if the user is not authenticated, it navigates to the login page
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
