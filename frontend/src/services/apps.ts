// Apps Service
// centralizes API calls related to external apps (SSO apps)

import { api } from "./axios"

// Get all apps current user has access to.
// Matches backend route: GET /sso/apps/access
export const getAccessibleApps = async () => {
  const response = await api.get(`/apps/get_user_apps`)
  return response.data
}

