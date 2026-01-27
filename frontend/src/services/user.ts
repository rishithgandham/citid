// User Service
// makes API calls for user routes (profile)

import axios from "axios";

const API_URL = 'http://localhost:5000';

// Configure axios to send cookies with requests (needed for HTTP-only cookies)
axios.defaults.withCredentials = true;

// Get Profile Function
// Makes a GET request to the profile route
// Returns the response data or throws an error with status code
export const getProfile = async () => {
    const response = await axios.get(`${API_URL}/profile`);
    console.log("Profile...", response.data);
    return response.data;

};
