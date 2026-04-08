import { type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { GrantByEmailsResult, OwnedAppPermission } from "@/services/apps"

/**
 * Props for granting a single permission to one or more users by email.
 */
export type AppAccessGrantToUsersProps = {
  /** Same list as the permissions table — drives the permission dropdown */
  permissions: OwnedAppPermission[]
  /** Raw textarea value (comma / space / semicolon separated addresses) */
  emails: string
  onEmailsChange: (value: string) => void
  /** Selected permission id as string (Radix Select uses string values) */
  permissionId: string
  onPermissionIdChange: (value: string) => void
  /** Submits to grant_by_emails; parent clears / sets result and errors */
  onGrant: (e: FormEvent) => void | Promise<void>
  isSaving: boolean
  /** Last API result from grant_by_emails; null until the first successful submit */
  result: GrantByEmailsResult | null
}

/**
 * Right column: pick a permission, enter emails, submit. Shows a summary of
 * granted, already granted, and unknown addresses after a run.
 */
export function AppAccessGrantToUsers({
  permissions,
  emails,
  onEmailsChange,
  permissionId,
  onPermissionIdChange,
  onGrant,
  isSaving,
  result,
}: AppAccessGrantToUsersProps) {
  const hasPermissions = permissions.length > 0

  return (
    <section className="min-w-0">
      <h2 className="text-lg font-semibold">Grant to users</h2>
      <p className="text-muted-foreground text-sm mt-1 mb-4">
        Enter one or more emails separated by commas, spaces, or semicolons. Users must
        already have accounts.
      </p>

      <form className="flex flex-col gap-4 max-w-md" onSubmit={onGrant}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="grant-emails">
            Emails
          </label>
          <textarea
            id="grant-emails"
            value={emails}
            onChange={(e) => onEmailsChange(e.target.value)}
            placeholder="user@example.com, other@example.com"
            rows={3}
            autoComplete="off"
            className={cn(
              "min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
              "placeholder:text-muted-foreground",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-input/30"
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="grant-permission">
            Permission
          </label>
          <Select
            value={permissionId || undefined}
            onValueChange={onPermissionIdChange}
            disabled={!hasPermissions}
          >
            <SelectTrigger id="grant-permission" className="w-full">
              <SelectValue
                placeholder={
                  hasPermissions ? "Select permission" : "Create a permission first"
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
        <div>
          <Button
            type="submit"
            variant="secondary"
            disabled={
              isSaving || !hasPermissions || !emails.trim() || !permissionId
            }
          >
            {isSaving ? "Granting…" : "Grant permission"}
          </Button>
        </div>
      </form>

      {result && (
        <div
          className="mt-4 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm max-w-md space-y-2"
          role="status"
        >
          {result.granted.length > 0 && (
            <p>
              <span className="font-medium text-foreground">Granted: </span>
              {result.granted.map((g) => g.email).join(", ")}
            </p>
          )}
          {result.already_granted.length > 0 && (
            <p className="text-muted-foreground">
              <span className="font-medium">Already had access: </span>
              {result.already_granted.map((g) => g.email).join(", ")}
            </p>
          )}
          {result.not_found.length > 0 && (
            <p className="text-destructive">
              <span className="font-medium">No account: </span>
              {result.not_found.join(", ")}
            </p>
          )}
          {result.granted.length === 0 &&
            result.already_granted.length === 0 &&
            result.not_found.length === 0 && (
              <p className="text-muted-foreground">No changes.</p>
            )}
        </div>
      )}
    </section>
  )
}
