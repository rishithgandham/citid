import { useEffect, useState, type FormEvent } from "react"

import { useProtectedRoute } from "@/context/AuthContext"
import { createApp, getAdminUserOptions, getOwnedApps } from "@/services/apps"
import type { AdminUserOption } from "@/services/apps"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Link } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type OwnedAppRow = {
  id: number
  name: string
  link: string | null
  owner?: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
}

function Apps() {
  const [apps, setApps] = useState<OwnedAppRow[]>([])
  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  /** `"_self"` = omit owner_id; backend makes the creating admin the owner. */
  const [ownerSelection, setOwnerSelection] = useState<string>("_self")
  const [adminUsers, setAdminUsers] = useState<AdminUserOption[]>([])
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [showClientDialog, setShowClientDialog] = useState(false)
  const { loading, admin } = useProtectedRoute()

  useEffect(() => {
    const load = async () => {
      const response = await getOwnedApps()
      setApps((response.apps ?? []) as OwnedAppRow[])
    }
    load()
  }, [])

  useEffect(() => {
    if (!admin) return
    const loadUsers = async () => {
      const res = await getAdminUserOptions()
      setAdminUsers(res.users ?? [])
    }
    loadUsers()
  }, [admin])

  if (loading) return <div>Loading...</div>

  const handleSubmitCreateApp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name || !admin) return
    const options =
      ownerSelection !== "_self"
        ? { owner_id: Number.parseInt(ownerSelection, 10) }
        : undefined
    const result = await createApp(name, link, options)
    const created: OwnedAppRow = {
      id: result.app.id,
      name: result.app.name,
      link: result.app.link ?? null,
    }
    const ownerId = result.app.owner_id as number
    const sel = adminUsers.find((u) => u.id === ownerId)
    if (sel) {
      created.owner = {
        id: sel.id,
        email: sel.email,
        first_name: sel.first_name,
        last_name: sel.last_name,
      }
    }
    setApps((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setCreatedClientId(result.app.client_id)
    setShowClientDialog(true)
    setName("")
    setLink("")
    setOwnerSelection("_self")
  }

  return (
    <div className="p-10">
      <p className="text-3xl font-semibold">{admin ? "Apps" : "Your Apps"}</p>
      <p className="text-muted-foreground text-sm">
        {admin
          ? "All registered apps. Platform administrators can create apps and assign an owner."
          : "Apps you own that use CIT ID."}
      </p>

      <div className="mt-6">
        {admin ? (
          <CreateAppDialog
            name={name}
            link={link}
            ownerSelection={ownerSelection}
            adminUsers={adminUsers}
            setName={setName}
            setLink={setLink}
            setOwnerSelection={setOwnerSelection}
            handleSubmit={handleSubmitCreateApp}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Only platform administrators can register new apps.
          </p>
        )}
      </div>

      <div className="mt-10">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>App</TableHead>
              {admin ? <TableHead>Owner</TableHead> : null}
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((item, index) => (
              <TableRow key={item.id ?? index}>
                <TableCell>
                  <Link to={`/apps/${item.id}`} className="hover:underline">
                    {item.name}
                  </Link>
                </TableCell>
                {admin ? (
                  <TableCell>
                    {item.owner
                      ? `${item.owner.first_name} ${item.owner.last_name} (${item.owner.email})`
                      : "—"}
                  </TableCell>
                ) : null}
                <TableCell>{item.link}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {createdClientId && (
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>App client ID</DialogTitle>
              <DialogDescription>
                Save this client ID as an environment variable in your application.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Example:</p>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                CITID_CLIENT_ID=&quot;{createdClientId}&quot;
              </code>
            </div>
            <DialogFooter showCloseButton>
              <Button type="button" onClick={() => setShowClientDialog(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CreateAppDialog({
  name,
  link,
  ownerSelection,
  adminUsers,
  setName,
  setLink,
  setOwnerSelection,
  handleSubmit,
}: {
  name: string
  link: string
  ownerSelection: string
  adminUsers: AdminUserOption[]
  setName: (value: string) => void
  setLink: (value: string) => void
  setOwnerSelection: (value: string) => void
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create app</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create app</DialogTitle>
          <DialogDescription>
            Register a new app that will use CIT ID for authentication. Choose who will own this
            app (manage permissions and credentials).
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">App name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">App link (optional)</label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://my-app.example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Owner</label>
            <Select value={ownerSelection} onValueChange={setOwnerSelection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">You (creator)</SelectItem>
                {adminUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.first_name} {u.last_name} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default Apps
