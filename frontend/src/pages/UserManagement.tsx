import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProtectedRoute } from "@/context/AuthContext"
import {
  listAdminUsers,
  patchUserAdminFlag,
  type AdminUserRow,
} from "@/services/admin"

type SortKey =
  | "id"
  | "email"
  | "first_name"
  | "last_name"
  | "created_at"
  | "email_verified"
  | "app_admin"

type SortDir = "asc" | "desc"

function compareUsers(
  a: AdminUserRow,
  b: AdminUserRow,
  key: SortKey,
  dir: SortDir
): number {
  const inv = dir === "asc" ? 1 : -1
  let cmp = 0
  switch (key) {
    case "id":
      cmp = a.id - b.id
      break
    case "email":
      cmp = a.email.localeCompare(b.email, undefined, { sensitivity: "base" })
      break
    case "first_name":
      cmp = a.first_name.localeCompare(b.first_name, undefined, {
        sensitivity: "base",
      })
      break
    case "last_name":
      cmp = a.last_name.localeCompare(b.last_name, undefined, {
        sensitivity: "base",
      })
      break
    case "created_at": {
      if (!a.created_at && !b.created_at) cmp = 0
      else if (!a.created_at) cmp = 1
      else if (!b.created_at) cmp = -1
      else
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      break
    }
    case "email_verified":
      cmp = Number(a.email_verified) - Number(b.email_verified)
      break
    case "app_admin":
      cmp = Number(a.app_admin) - Number(b.app_admin)
      break
    default:
      cmp = 0
  }
  return cmp * inv
}

function userMatchesSearch(u: AdminUserRow, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const terms = q.split(/\s+/).filter(Boolean)
  const haystack = [
    u.email,
    u.first_name,
    u.last_name,
    String(u.id),
    u.created_at ?? "",
    u.email_verified ? "yes verified" : "no",
    u.app_admin ? "admin administrator" : "",
  ]
    .join(" ")
    .toLowerCase()
  return terms.every((t) => haystack.includes(t))
}

function SortableTableHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  column: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (col: SortKey) => void
  className?: string
}) {
  const active = sortKey === column
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
        onClick={() => onSort(column)}
        aria-sort={
          active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3.5 shrink-0 opacity-70" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
          )
        ) : (
          <ArrowUpDown
            className="size-3.5 shrink-0 opacity-35"
            aria-hidden
          />
        )}
      </button>
    </TableHead>
  )
}

function UserManagement() {
  const navigate = useNavigate()
  const { loading, admin } = useProtectedRoute()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("email")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [searchQuery, setSearchQuery] = useState("")

  const handleSort = (column: SortKey) => {
    if (sortKey === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(column)
      setSortDir("asc")
    }
  }

  const filteredUsers = useMemo(
    () => users.filter((u) => userMatchesSearch(u, searchQuery)),
    [users, searchQuery]
  )

  const sortedUsers = useMemo(() => {
    const copy = [...filteredUsers]
    copy.sort((a, b) => compareUsers(a, b, sortKey, sortDir))
    return copy
  }, [filteredUsers, sortKey, sortDir])

  useEffect(() => {
    if (loading) return
    if (!admin) {
      navigate("/", { replace: true })
      return
    }
    const load = async () => {
      setPageLoading(true)
      setLoadError(null)
      try {
        const res = await listAdminUsers()
        setUsers(res.users ?? [])
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "response" in e
            ? (e as { response?: { data?: { msg?: string } } }).response?.data
                ?.msg
            : null
        setLoadError(msg ?? "Failed to load users")
      } finally {
        setPageLoading(false)
      }
    }
    void load()
  }, [loading, admin, navigate])

  const handleAdminToggle = async (row: AdminUserRow, checked: boolean) => {
    setToggleError(null)
    setTogglingId(row.id)
    try {
      const data = await patchUserAdminFlag(row.id, { app_admin: checked })
      setUsers((prev) =>
        prev.map((u) => (u.id === row.id ? data.user : u))
      )
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { msg?: string } } }).response?.data?.msg
          : null
      setToggleError(msg ?? "Could not update administrator status")
    } finally {
      setTogglingId(null)
    }
  }

  if (loading || pageLoading) return <div className="p-10">Loading…</div>

  if (!admin) return null

  return (
    <div className="p-10">
      <h1 className="text-3xl font-semibold">User management</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
        Platform administrators can view all CitID accounts and grant or revoke the
        administrator role. Passwords and other secrets are never shown.
      </p>

      {loadError ? (
        <p className="mt-6 text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}
      {toggleError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {toggleError}
        </p>
      ) : null}

      <div className="mt-8 max-w-md">
        <label htmlFor="user-search" className="text-sm font-medium">
          Search users
        </label>
        <div className="relative mt-2">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="user-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Email, name, id, or multiple words…"
            className="pl-9"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {searchQuery.trim() ? (
          <p className="text-muted-foreground mt-2 text-xs">
            Showing {sortedUsers.length} of {users.length} users
          </p>
        ) : null}
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <SortableTableHead
                label="ID"
                column="id"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="w-14"
              />
              <SortableTableHead
                label="Email"
                column="email"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="First name"
                column="first_name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Last name"
                column="last_name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Created"
                column="created_at"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Email verified"
                column="email_verified"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Platform admin"
                column="app_admin"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="text-center [&_button]:mx-auto"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  {users.length === 0
                    ? "No users loaded."
                    : "No users match your search."}
                </TableCell>
              </TableRow>
            ) : null}
            {sortedUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-mono text-sm">{u.id}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.first_name}</TableCell>
                <TableCell>{u.last_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </TableCell>
                <TableCell>{u.email_verified ? "Yes" : "No"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={u.app_admin}
                      disabled={togglingId === u.id}
                      onCheckedChange={(v) =>
                        handleAdminToggle(u, v === true)
                      }
                      aria-label={`Platform admin for ${u.email}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default UserManagement
