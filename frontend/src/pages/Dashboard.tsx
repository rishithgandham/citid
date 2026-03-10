import { useEffect, useState } from "react";
import { useProtectedRoute } from "../context/AuthContext";
import { getAccessibleApps } from "@/services/apps";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";




function Dashboard() {

    const [accessibleApps, setAccessibleApps] = useState<any[]>([]);
    const { email, firstName, lastName, loading, logoutUser } = useProtectedRoute();

    useEffect(() => {
        const fetchAccessibleApps = async () => {
            const response = await getAccessibleApps();
            setAccessibleApps(response.apps);
        };
        fetchAccessibleApps();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-10">

            <p className="text-3xl font-semibold">Welcome, {firstName} {lastName},</p>
            <p className="text-muted-foreground text-sm">You have access to the following apps:</p>


            {/* Apps that the user has access to */}
            <AccessibleApps accessibleApps={accessibleApps} />


        </div>
    )
}


function AccessibleApps({ accessibleApps }: { accessibleApps: any[] }) {
    return (
        <div className="mt-10">

            <Table>
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Link</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accessibleApps.map((app) => (
                        <TableRow key={app.id}>
                            <TableCell>{app.name}</TableCell>
                            <TableCell>{app.permission}</TableCell>
                            <TableCell>{app.link}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
export default Dashboard