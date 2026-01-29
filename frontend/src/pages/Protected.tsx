import { useProtectedRoute } from "../context/AuthContext";
import { logout } from "../services/auth";




// Protected Page -- Temp Page
function Protected() {
    const { email, loading  } = useProtectedRoute();

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div>Protected {email}</div>
            <button onClick={logout}>Logout</button>
        </div>
    )
}

export default Protected