import { useProtectedRoute } from "../context/AuthContext";




function Dashboard() {
    const { email, loading, logoutUser } = useProtectedRoute();

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div>Protected {email}</div>
            <button onClick={logoutUser}>Logout</button>
        </div>
    )
}

export default Dashboard