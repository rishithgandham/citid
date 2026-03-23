import { type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Props for the edit-app modal. All string fields are controlled by the parent
 * so the page can load app data once and keep a single source of truth.
 */
export type AppAccessEditModalProps = {
  /** Whether the dialog is visible */
  open: boolean
  /** Called when the user closes the dialog (overlay click, Escape, Done) */
  onOpenChange: (open: boolean) => void
  /** Current app display name */
  name: string
  /** Optional marketing or launch URL for the app */
  link: string
  /** Updates the name field as the user types */
  onNameChange: (value: string) => void
  /** Updates the link field as the user types */
  onLinkChange: (value: string) => void
  /** Persist name + link to the server (parent runs updateOwnedApp) */
  onSave: (e: FormEvent) => void | Promise<void>
  /** Disables the Save button while a request is in flight */
  isSaving?: boolean
}

/**
 * Modal form to edit an owned app’s name and optional link.
 * Saving does not close the modal so the user can continue editing or dismiss explicitly.
 */
export function AppAccessEditModal({
  open,
  onOpenChange,
  name,
  link,
  onNameChange,
  onLinkChange,
  onSave,
  isSaving = false,
}: AppAccessEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit app</DialogTitle>
          <DialogDescription>
            Update how this app appears in CitID and the optional URL shown to users.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4 pt-2" onSubmit={onSave}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="edit-app-name">
              App name
            </label>
            <Input
              id="edit-app-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="edit-app-link">
              App link (optional)
            </label>
            <Input
              id="edit-app-link"
              value={link ?? ""}
              onChange={(e) => onLinkChange(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
