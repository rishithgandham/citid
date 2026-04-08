import { type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OwnedAppPermission } from "@/services/apps"

/**
 * Props for the permissions section: create new permission rows and list existing ones.
 */
export type AppAccessPermissionsProps = {
  /** Permissions already defined for this app (from GET /apps/:id/permissions) */
  permissions: OwnedAppPermission[]
  /** Controlled input: new permission name */
  newName: string
  onNewNameChange: (value: string) => void
  /** Controlled input: optional description for the new permission */
  newDescription: string
  onNewDescriptionChange: (value: string) => void
  /** Handler for the “Add permission” form submit */
  onAddPermission: (e: FormEvent) => void | Promise<void>
  /** True while POST /permissions is in progress */
  isSaving: boolean
}

/**
 * Left column: form to define a new permission (name + description) and a table
 * listing all permissions for the app (used as SSO scopes).
 */
export function AppAccessPermissions({
  permissions,
  newName,
  onNewNameChange,
  newDescription,
  onNewDescriptionChange,
  onAddPermission,
  isSaving,
}: AppAccessPermissionsProps) {
  return (
    <section className="min-w-0">
      <h2 className="text-lg font-semibold">Permissions</h2>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Names are unique per app. Use them when requesting scopes from SSO.
      </p>

      <form className="flex flex-col gap-4 max-w-md mb-8" onSubmit={onAddPermission}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="perm-name">
            Permission name
          </label>
          <Input
            id="perm-name"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="e.g. read:data"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="perm-desc">
            Description (optional)
          </label>
          <Input
            id="perm-desc"
            value={newDescription}
            onChange={(e) => onNewDescriptionChange(e.target.value)}
            placeholder="What this permission allows"
            autoComplete="off"
          />
        </div>
        <div>
          <Button type="submit" disabled={isSaving || !newName.trim()}>
            {isSaving ? "Adding…" : "Add permission"}
          </Button>
        </div>
      </form>

      {permissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No permissions yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.description ?? "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{p.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
