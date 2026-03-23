import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OwnedAppUserGrant } from "@/services/apps"

export type AppAccessUserGrantsTableProps = {
  /** Rows from GET /apps/:id/permissions/grants (one object per user) */
  users: OwnedAppUserGrant[]
}

/**
 * Full-width table under the two permission columns: every account with access
 * to this app and each permission they were granted (comma-separated names).
 */
export function AppAccessUserGrantsTable({ users }: AppAccessUserGrantsTableProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No users have been granted permissions yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Permissions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.user_id}>
            <TableCell className="font-medium">
              {u.first_name} {u.last_name}
            </TableCell>
            <TableCell className="text-muted-foreground">{u.email}</TableCell>
            <TableCell className="font-mono text-sm">
              {u.permissions.map((p) => p.name).join(", ") || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
