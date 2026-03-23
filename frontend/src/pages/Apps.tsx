import { useEffect, useState, type FormEvent } from "react"

import { useProtectedRoute } from "@/context/AuthContext"
import { createApp, getOwnedApps } from "@/services/apps"
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

function Apps() {
  const [apps, setApps] = useState<any[]>([])
  const [name, setName] = useState("")
  const [link, setLink] = useState("")
  const [createdClientId, setCreatedClientId] = useState<string | null>(null)
  const [showClientDialog, setShowClientDialog] = useState(false)
  const { loading } = useProtectedRoute()

  useEffect(() => {
    const fetchOwnedApps = async () => {
      const response = await getOwnedApps()
      setApps(response.apps ?? [])
    }
    fetchOwnedApps()
  }, [])

  if (loading) return <div>Loading...</div>

  const handleSubmitCreateApp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name) return
    const result = await createApp(name, link)
    const created = { id: result.app.id, name: result.app.name, link: result.app.link }
    setApps((prev) => [...prev, created])
    setCreatedClientId(result.app.client_id)
    setShowClientDialog(true)
    setName("")
    setLink("")
  }

  return (
    <div className="p-10">
      <p className="text-3xl font-semibold">Your Apps</p>
      <p className="text-muted-foreground text-sm">
        Create and manage apps that use CIT ID.
      </p>

      <div className="mt-6">
        <CreateAppDialog
          name={name}
          link={link}
          setName={setName}
          setLink={setLink}
          handleSubmit={handleSubmitCreateApp}
        />
      </div>

      <div className="mt-10">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>App</TableHead>
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
  setName,
  setLink,
  handleSubmit,
}: {
  name: string
  link: string
  setName: (value: string) => void
  setLink: (value: string) => void
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
            Register a new app that will use CIT ID for authentication.
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
          <DialogFooter>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default Apps

