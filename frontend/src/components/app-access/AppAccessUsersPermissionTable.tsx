import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getAppUserDirectory,
  grantOwnedAppPermissionBulk,
  type AdminUserOption,
  type GrantBulkResult,
  type OwnedAppPermission,
  type OwnedAppUserGrant,
} from "@/services/apps"

export type AppAccessUsersPermissionTableProps = {
  appId: number
  permissions: OwnedAppPermission[]
  /** Users who already have at least one grant (merged into rows for permission labels) */
  grantUsers: OwnedAppUserGrant[]
  /** Refetch grants after a successful bulk assign */
  onGrantsUpdated: () => Promise<void>
}

function grantsForUser(
  userId: number,
  grantUsers: OwnedAppUserGrant[]
): { id: number; name: string }[] {
  const row = grantUsers.find((g) => g.user_id === userId)
  return row?.permissions ?? []
}

type SortKey = "access" | "name" | "email" | "permission_count"

type SortDir = "asc" | "desc"

function displayName(u: AdminUserOption): string {
  return `${u.first_name} ${u.last_name}`.trim()
}

function compareDirectoryRows(
  a: AdminUserOption,
  b: AdminUserOption,
  grantUsers: OwnedAppUserGrant[],
  key: SortKey,
  dir: SortDir
): number {
  const inv = dir === "asc" ? 1 : -1
  const permsA = grantsForUser(a.id, grantUsers)
  const permsB = grantsForUser(b.id, grantUsers)
  const countA = permsA.length
  const countB = permsB.length
  const hasA = countA > 0 ? 1 : 0
  const hasB = countB > 0 ? 1 : 0
  let cmp = 0
  switch (key) {
    case "access":
      cmp = hasA - hasB
      break
    case "name":
      cmp = displayName(a).localeCompare(displayName(b), undefined, {
        sensitivity: "base",
      })
      break
    case "email":
      cmp = a.email.localeCompare(b.email, undefined, { sensitivity: "base" })
      break
    case "permission_count":
      cmp = countA - countB
      break
  }
  return cmp * inv
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
          <ArrowUpDown className="size-3.5 shrink-0 opacity-35" aria-hidden />
        )}
      </button>
    </TableHead>
  )
}

/**
 * Full user directory with current permissions per row, row selection, and bulk assign.
 */
export function AppAccessUsersPermissionTable({
  appId,
  permissions,
  grantUsers,
  onGrantsUpdated,
}: AppAccessUsersPermissionTableProps) {
  const [directoryUsers, setDirectoryUsers] = useState<AdminUserOption[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingDirectory, setLoadingDirectory] = useState(true)

  const [selected, setSelected] = useState<Set<number>>(() => new Set())
  const [bulkPermissionId, setBulkPermissionId] = useState("")
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<GrantBulkResult | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  /** Default: users with at least one permission first (desc on access). */
  const [sortKey, setSortKey] = useState<SortKey>("access")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (column: SortKey) => {
    if (sortKey === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(column)
      // Access: show users with permissions first; others: A→Z / low→high first.
      setSortDir(column === "access" || column === "permission_count" ? "desc" : "asc")
    }
  }

  const refreshDirectory = useCallback(async () => {
    setLoadingDirectory(true)
    setLoadError(null)
    try {
      const res = await getAppUserDirectory(appId)
      setDirectoryUsers(res.users ?? [])
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { msg?: string } } }).response?.data?.msg
          : null
      setLoadError(msg ?? "Failed to load users")
      setDirectoryUsers([])
    } finally {
      setLoadingDirectory(false)
    }
  }, [appId])

  useEffect(() => {
    refreshDirectory()
  }, [refreshDirectory])

  const sortedDirectoryUsers = useMemo(() => {
    const copy = [...directoryUsers]
    copy.sort((a, b) => {
      const c = compareDirectoryRows(a, b, grantUsers, sortKey, sortDir)
      if (c !== 0) return c
      return a.email.localeCompare(b.email, undefined, { sensitivity: "base" })
    })
    return copy
  }, [directoryUsers, grantUsers, sortKey, sortDir])

  const allIds = useMemo(() => directoryUsers.map((u) => u.id), [directoryUsers])
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = allIds.some((id) => selected.has(id)) && !allSelected

  const toggleRow = (userId: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(userId)
      else next.delete(userId)
      return next
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelected(new Set(allIds))
    else setSelected(new Set())
  }

  const handleBulkAssign = async () => {
    if (!bulkPermissionId.trim() || selected.size === 0) return
    setBulkSaving(true)
    setBulkError(null)
    setBulkResult(null)
    try {
      const result = await grantOwnedAppPermissionBulk(appId, {
        permission_id: Number.parseInt(bulkPermissionId, 10),
        user_ids: Array.from(selected),
      })
      setBulkResult(result)
      setSelected(new Set())
      await onGrantsUpdated()
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { msg?: string } } }).response?.data?.msg
          : null
      setBulkError(msg ?? "Bulk assign failed")
    } finally {
      setBulkSaving(false)
    }
  }

  const canBulk = permissions.length > 0 && selected.size > 0 && bulkPermissionId.trim() !== ""

  if (loadingDirectory) {
    return <p className="text-sm text-muted-foreground">Loading users…</p>
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <span className="text-sm font-medium">Permission to assign</span>
          <Select
            value={bulkPermissionId}
            onValueChange={setBulkPermissionId}
            disabled={permissions.length === 0}
          >
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue
                placeholder={
                  permissions.length === 0
                    ? "No permissions defined"
                    : "Select permission"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {permissions.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => void handleBulkAssign()}
          disabled={!canBulk || bulkSaving}
        >
          {bulkSaving
            ? "Assigning…"
            : `Assign to ${selected.size} selected`}
        </Button>
      </div>

      {permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Define at least one permission above before you can assign access in bulk.
        </p>
      ) : null}

      {bulkError ? (
        <p className="text-sm text-destructive" role="alert">
          {bulkError}
        </p>
      ) : null}

      {bulkResult ? (
        <p className="text-sm text-muted-foreground">
          Granted: {bulkResult.granted.length}. Already had permission:{" "}
          {bulkResult.already_granted.length}. Unknown user ids:{" "}
          {bulkResult.not_found.length}.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    someSelected ? "indeterminate" : allSelected ? true : false
                  }
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  aria-label="Select all users"
                />
              </TableHead>
              <SortableTableHead
                label="User"
                column="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Email"
                column="email"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTableHead
                label="Access"
                column="access"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className="w-24"
              />
              <SortableTableHead
                label="Current permissions"
                column="permission_count"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDirectoryUsers.map((u) => {
              const perms = grantsForUser(u.id, grantUsers)
              const permLabel = perms.map((p) => p.name).join(", ") || "—"
              const hasAccess = perms.length > 0
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(u.id)}
                      onCheckedChange={(v) => toggleRow(u.id, v === true)}
                      aria-label={`Select ${u.email}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {u.first_name} {u.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="text-sm">
                    {hasAccess ? (
                      <span className="text-foreground">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{permLabel}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
