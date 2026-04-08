// Apps Service
// centralizes API calls related to external apps (SSO apps)

import { api } from "./axios"

export type AccessibleApp = {
  app: string
  link: string | null
  /** Permission names granted for this app (one row per app from API). */
  permissions: string[]
}

// Apps the current user can access; one entry per app with all permission names.
// Backend: GET /apps/get_user_apps
export const getAccessibleApps = async () => {
  const response = await api.get<{ apps: AccessibleApp[] }>(`/apps/get_user_apps`)
  return response.data
}

// Get all apps current user owns.
// Backend: GET /apps/get_owned_apps
export const getOwnedApps = async () => {
  const response = await api.get(`/apps/get_owned_apps`)
  return response.data
}

// Create a new app (platform admins only). Optional owner_id assigns another user as owner.
// Backend: POST /apps/create_app
export const createApp = async (
  name: string,
  link: string,
  options?: { owner_id?: number; redirect_uris?: string[] }
) => {
  const body: {
    name: string
    link: string
    owner_id?: number
    redirect_uris?: string[]
  } = { name, link }
  if (options?.owner_id != null) body.owner_id = options.owner_id
  if (options?.redirect_uris != null && options.redirect_uris.length > 0) {
    body.redirect_uris = options.redirect_uris
  }
  const response = await api.post(`/apps/create_app`, body)
  return response.data
}

export type AdminUserOption = {
  id: number
  email: string
  first_name: string
  last_name: string
}

// Platform admins: list users for assigning app ownership. Backend: GET /apps/admin/users
export const getAdminUserOptions = async () => {
  const response = await api.get<{ users: AdminUserOption[] }>(`/apps/admin/users`)
  return response.data
}

// Get an app owned by the current user (name/link only)
// Backend: GET /apps/<app_id>
export const getOwnedApp = async (appId: number) => {
  const response = await api.get(`/apps/${appId}`)
  return response.data
}

// Update app metadata (platform administrators only). Optional owner_id changes the owner.
// Backend: PUT /apps/<app_id>
export const updateOwnedApp = async (
  appId: number,
  payload: { name: string; link?: string | null; owner_id?: number }
) => {
  const response = await api.put(`/apps/${appId}`, payload)
  return response.data
}

// Delete an app owned by the current user
// Backend: DELETE /apps/<app_id>
export const deleteOwnedApp = async (appId: number) => {
  const response = await api.delete(`/apps/${appId}`)
  return response.data
}

// Fetch the app client_id (only the owner is allowed to view it)
// Backend: GET /apps/<app_id>/client_id
export const getOwnedAppClientId = async (appId: number) => {
  const response = await api.get(`/apps/${appId}/client_id`)
  return response.data
}

export type OwnedAppPermission = {
  id: number
  name: string
  description: string | null
}

// List permissions for an owned app (owner only)
// Backend: GET /apps/<app_id>/permissions
export const getOwnedAppPermissions = async (appId: number) => {
  const response = await api.get<{ permissions: OwnedAppPermission[] }>(
    `/apps/${appId}/permissions`
  )
  return response.data
}

// Create a permission on an owned app (owner only)
// Backend: POST /apps/<app_id>/permissions
export const createOwnedAppPermission = async (
  appId: number,
  payload: { name: string; description?: string | null }
) => {
  const response = await api.post(`/apps/${appId}/permissions`, payload)
  return response.data as {
    msg: string
    permission: OwnedAppPermission
  }
}

export type GrantByEmailsResult = {
  msg: string
  granted: { email: string; user_id: number }[]
  not_found: string[]
  already_granted: { email: string; user_id: number }[]
}

// Grant a permission to users by email (comma / space / semicolon separated). Owner only.
// Backend: POST /apps/<app_id>/permissions/grant_by_emails
export const grantOwnedAppPermissionByEmails = async (
  appId: number,
  payload: { emails: string; permission_id: number }
) => {
  const response = await api.post<GrantByEmailsResult>(
    `/apps/${appId}/permissions/grant_by_emails`,
    payload
  )
  return response.data
}

/** One user’s grants on an app (from GET .../permissions/grants) */
export type OwnedAppUserGrant = {
  user_id: number
  email: string
  first_name: string
  last_name: string
  permissions: { id: number; name: string }[]
}

// Users who have access to this app and which permissions they hold. Owner only.
// Backend: GET /apps/<app_id>/permissions/grants
export const getOwnedAppPermissionGrants = async (appId: number) => {
  const response = await api.get<{ users: OwnedAppUserGrant[] }>(
    `/apps/${appId}/permissions/grants`
  )
  return response.data
}

/** All users (directory picker). Owner or platform admin. GET /apps/:id/users/directory */
export const getAppUserDirectory = async (appId: number) => {
  const response = await api.get<{ users: AdminUserOption[] }>(
    `/apps/${appId}/users/directory`
  )
  return response.data
}

export type GrantBulkResult = {
  msg: string
  granted: { user_id: number; email: string }[]
  not_found: number[]
  already_granted: { user_id: number; email: string }[]
}

/** Grant one permission to many users by id. POST /apps/:id/permissions/grant_bulk */
export const grantOwnedAppPermissionBulk = async (
  appId: number,
  payload: { permission_id: number; user_ids: number[] }
) => {
  const response = await api.post<GrantBulkResult>(
    `/apps/${appId}/permissions/grant_bulk`,
    payload
  )
  return response.data
}

