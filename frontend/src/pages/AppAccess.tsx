import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useParams } from "react-router-dom"

import { AppAccessEditModal } from "@/components/app-access/AppAccessEditModal"
import { AppAccessGrantToUsers } from "@/components/app-access/AppAccessGrantToUsers"
import { AppAccessPermissions } from "@/components/app-access/AppAccessPermissions"
import { AppAccessUserGrantsTable } from "@/components/app-access/AppAccessUserGrantsTable"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useProtectedRoute } from "@/context/AuthContext"
import {
  createOwnedAppPermission,
  deleteOwnedApp,
  getOwnedApp,
  getOwnedAppClientId,
  getOwnedAppPermissionGrants,
  getOwnedAppPermissions,
  grantOwnedAppPermissionByEmails,
  updateOwnedApp,
  type GrantByEmailsResult,
  type OwnedAppPermission,
  type OwnedAppUserGrant,
} from "@/services/apps"

/**
 * Owner-only page for a single SSO app: edit metadata (modal), define permissions,
 * grant permissions by email, reveal client_id, or delete the app.
 */
function AppAccess() {
  const { appId } = useParams()

  /** Parsed route param; null if the URL is not a valid number */
  const numericAppId = useMemo(() => {
    const n = Number(appId)
    return Number.isFinite(n) ? n : null
  }, [appId])

  const { loading } = useProtectedRoute()

  /** App fields mirrored from GET /apps/:id (also edited in the modal) */
  const [appName, setAppName] = useState("")
  const [appLink, setAppLink] = useState("")
  const [appLoading, setAppLoading] = useState(true)

  /** Shared error line for API failures (load, save, permissions, grant, client_id, delete) */
  const [actionError, setActionError] = useState<string | null>(null)

  /** Controls the edit name/link dialog */
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  /** OAuth public client id — only set after “Reveal” succeeds */
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [clientLoading, setClientLoading] = useState(false)

  /** Permissions list + “add permission” form state */
  const [permissions, setPermissions] = useState<OwnedAppPermission[]>([])
  const [permName, setPermName] = useState("")
  const [permDescription, setPermDescription] = useState("")
  const [permSaving, setPermSaving] = useState(false)

  /** Grant-by-email form + last grant response for the summary panel */
  const [grantEmails, setGrantEmails] = useState("")
  const [grantPermissionId, setGrantPermissionId] = useState("")
  const [grantSaving, setGrantSaving] = useState(false)
  const [grantResult, setGrantResult] = useState<GrantByEmailsResult | null>(null)

  /** Users with at least one grant on this app (GET .../permissions/grants) */
  const [grantUsers, setGrantUsers] = useState<OwnedAppUserGrant[]>([])

  /** Load app details, permission definitions, and user grant rows */
  useEffect(() => {
    const load = async () => {
      if (numericAppId === null) return
      setAppLoading(true)
      try {
        const response = await getOwnedApp(numericAppId)
        setAppName(response.app?.name ?? "")
        setAppLink(response.app?.link ?? "")
        try {
          const permRes = await getOwnedAppPermissions(numericAppId)
          setPermissions(permRes.permissions ?? [])
        } catch {
          setPermissions([])
        }
        try {
          const grantsRes = await getOwnedAppPermissionGrants(numericAppId)
          setGrantUsers(grantsRes.users ?? [])
        } catch {
          setGrantUsers([])
        }
      } catch (e: any) {
        setActionError(e?.response?.data?.msg ?? "Failed to load app")
      } finally {
        setAppLoading(false)
      }
    }

    if (!loading) {
      if (numericAppId === null) {
        setActionError("Invalid app id")
        setAppLoading(false)
      } else {
        load()
      }
    }
  }, [numericAppId, loading])

  if (loading || appLoading) return <div>Loading...</div>

  /** Persist app name + link from the edit modal */
  const handleSaveApp = async (e: FormEvent) => {
    e.preventDefault()
    if (numericAppId === null) return
    setActionError(null)
    setEditSaving(true)
    try {
      await updateOwnedApp(numericAppId, { name: appName, link: appLink || null })
      setEditModalOpen(false)
    } catch (err: any) {
      setActionError(err?.response?.data?.msg ?? "Failed to save app")
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async () => {
    if (numericAppId === null) return
    setActionError(null)

    const ok = window.confirm("Delete this app? This cannot be undone.")
    if (!ok) return

    try {
      await deleteOwnedApp(numericAppId)
      window.location.href = "/apps"
    } catch (err: any) {
      setActionError(err?.response?.data?.msg ?? "Failed to delete app")
    }
  }

  const handleAddPermission = async (e: FormEvent) => {
    e.preventDefault()
    if (numericAppId === null) return
    const name = permName.trim()
    if (!name) return
    setPermSaving(true)
    setActionError(null)
    try {
      const desc = permDescription.trim()
      const result = await createOwnedAppPermission(numericAppId, {
        name,
        description: desc || null,
      })
      setPermissions((prev) =>
        [...prev, result.permission].sort((a, b) => a.name.localeCompare(b.name))
      )
      setPermName("")
      setPermDescription("")
    } catch (err: any) {
      setActionError(err?.response?.data?.msg ?? "Failed to create permission")
    } finally {
      setPermSaving(false)
    }
  }

  const handleGrantByEmails = async (e: FormEvent) => {
    e.preventDefault()
    if (numericAppId === null) return
    if (!grantPermissionId.trim()) {
      setActionError("Select a permission")
      return
    }
    if (!grantEmails.trim()) {
      setActionError("Enter at least one email")
      return
    }
    setGrantSaving(true)
    setActionError(null)
    setGrantResult(null)
    try {
      const result = await grantOwnedAppPermissionByEmails(numericAppId, {
        emails: grantEmails,
        permission_id: Number(grantPermissionId),
      })
      setGrantResult(result)
      try {
        const grantsRes = await getOwnedAppPermissionGrants(numericAppId)
        setGrantUsers(grantsRes.users ?? [])
      } catch {
        /* leave previous table if refresh fails */
      }
    } catch (err: any) {
      setActionError(err?.response?.data?.msg ?? "Failed to grant permission")
    } finally {
      setGrantSaving(false)
    }
  }

  const handleRevealClientId = async () => {
    if (numericAppId === null) return
    setClientLoading(true)
    setActionError(null)

    try {
      const response = await getOwnedAppClientId(numericAppId)
      setClientId(response.client_id)
      setClientDialogOpen(true)
    } catch (err: any) {
      setActionError(err?.response?.data?.msg ?? "Failed to fetch client_id")
    } finally {
      setClientLoading(false)
    }
  }

  return (
    <div className="p-10">
      {/* Title row: actions open edit modal, reveal client secret, or delete */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-3xl font-semibold">{appName || "App"}</p>
          <p className="text-muted-foreground text-sm mt-1">
            Manage permissions, grant access by email, and reveal your client_id.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setEditModalOpen(true)}>
            Edit app
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleRevealClientId}
            disabled={clientLoading}
          >
            {clientLoading ? "Loading..." : "Reveal client_id"}
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete app
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="mt-6 text-sm text-destructive max-w-lg" role="alert">
          {actionError}
        </div>
      )}

      {/*
        Two columns on large screens: permissions (left) | divider | grant (right).
        Stacks vertically on small screens with a horizontal rule between sections.
      */}
      <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-0">
        <div className="flex-1 min-w-0 lg:pr-8">
          <AppAccessPermissions
            permissions={permissions}
            newName={permName}
            onNewNameChange={setPermName}
            newDescription={permDescription}
            onNewDescriptionChange={setPermDescription}
            onAddPermission={handleAddPermission}
            isSaving={permSaving}
          />
        </div>

        <Separator orientation="horizontal" className="lg:hidden" />
        <Separator
          orientation="vertical"
          className="hidden lg:block self-stretch min-h-[min(28rem,70vh)] w-px shrink-0"
        />

        <div className="flex-1 min-w-0 lg:pl-8">
          <AppAccessGrantToUsers
            permissions={permissions}
            emails={grantEmails}
            onEmailsChange={setGrantEmails}
            permissionId={grantPermissionId}
            onPermissionIdChange={setGrantPermissionId}
            onGrant={handleGrantByEmails}
            isSaving={grantSaving}
            result={grantResult}
          />
        </div>
      </div>

      <Separator className="mt-12" />
      <section className="mt-10 max-w-4xl">
        <h2 className="text-lg font-semibold">Users with access</h2>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          Everyone who has been granted at least one permission for this app.
        </p>
        <AppAccessUserGrantsTable users={grantUsers} />
      </section>

      <AppAccessEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        name={appName}
        link={appLink}
        onNameChange={setAppName}
        onLinkChange={setAppLink}
        onSave={handleSaveApp}
        isSaving={editSaving}
      />

      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>client_id</DialogTitle>
            <DialogDescription>
              Keep this secret. Use it as an environment variable in your app.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              CITID_CLIENT_ID=&quot;{clientId ?? ""}&quot;
            </code>
          </div>
          <DialogFooter showCloseButton>
            <Button type="button" onClick={() => setClientDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AppAccess
