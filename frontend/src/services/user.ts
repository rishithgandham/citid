// User Service
// makes API calls for user routes (profile)

import { api } from './axios';

// Get Profile Function
// Makes a GET request to the profile route
// Returns the response data or throws an error with status code
export const getProfile = async () => {
    const response = await api.get(`/profile`);
    console.log("Profile...", response.data);
    return response.data;

};
