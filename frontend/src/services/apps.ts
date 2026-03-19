// Apps Service
// centralizes API calls related to external apps (SSO apps)

import { api } from "./axios"

// Get all apps current user has access to (via permissions).
// Backend: GET /apps/get_user_apps
export const getAccessibleApps = async () => {
  const response = await api.get(`/apps/get_user_apps`)
  return response.data
}

// Get all apps current user owns.
// Backend: GET /apps/get_owned_apps
export const getOwnedApps = async () => {
  const response = await api.get(`/apps/get_owned_apps`)
  return response.data
}

// Create a new app owned by the current user.
// Backend: POST /apps/create_app
export const createApp = async (name: string, link: string) => {
  const response = await api.post(`/apps/create_app`, { name, link })
  return response.data
}

