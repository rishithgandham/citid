import { api } from "./axios"

export type AdminUserRow = {
  id: number
  email: string
  first_name: string
  last_name: string
  created_at: string | null
  app_admin: boolean
  email_verified: boolean
}

/** GET /admin/users — platform administrators only */
export const listAdminUsers = async () => {
  const response = await api.get<{ users: AdminUserRow[] }>("/admin/users")
  return response.data
}

/** PATCH /admin/users/:id — set app_admin */
export const patchUserAdminFlag = async (
  userId: number,
  payload: { app_admin: boolean }
) => {
  const response = await api.patch<{ msg: string; user: AdminUserRow }>(
    `/admin/users/${userId}`,
    payload
  )
  return response.data
}
