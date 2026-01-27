import { useProtectedRoute } from "../context/AuthContext";




// Protected Page -- Temp Page
function Protected() {
    const { email, loading  } = useProtectedRoute();

    if (loading) return <div>Loading...</div>;

    return (
        <div>Protected {email}</div>
    )
}

export default Protected