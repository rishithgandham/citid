import { useEffect, useState } from "react"
import { useProtectedRoute } from "../context/AuthContext"
import {
  getAccessibleApps,
  type AccessibleApp,
} from "@/services/apps"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function Dashboard() {
  const [accessibleApps, setAccessibleApps] = useState<AccessibleApp[]>([])
    const { firstName, lastName, loading } = useProtectedRoute();

  useEffect(() => {
    const fetchAccessibleApps = async () => {
      const response = await getAccessibleApps()
      setAccessibleApps(response.apps ?? [])
    }
    fetchAccessibleApps()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-10">
      <p className="text-3xl font-semibold">
        Welcome, {firstName} {lastName},
      </p>
      <p className="text-muted-foreground text-sm">
        You have access to the following apps:
      </p>

      <AccessibleApps accessibleApps={accessibleApps} />
    </div>
  )
}

function AccessibleApps({
  accessibleApps,
}: {
  accessibleApps: AccessibleApp[]
}) {
  return (
    <div className="mt-10">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accessibleApps.map((item, idx) => (
            <TableRow key={`${item.app}-${item.link ?? ""}-${idx}`}>
              <TableCell>{item.app}</TableCell>
              <TableCell className="font-mono text-sm">
                {item.permissions?.length
                  ? item.permissions.join(", ")
                  : "—"}
              </TableCell>
              <TableCell>{item.link ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default Dashboard