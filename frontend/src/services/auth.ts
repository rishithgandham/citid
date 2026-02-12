// Authentication Service 
// makes API calls for authentication routes (login, register)

import { api, refreshApi } from './axios';


// Register Function
// Makes a POST request to the register route with the email and password
// Returns the response data (token is set as HTTP cookie)
export const register = async (email: string, password: string) => {
    console.log("Registering user...", email, password);
    const response = await api.post(`/auth/register`, { email, password });
    return response.data;
};

// Login Function
// Makes a POST request to the login route with the email and password
// Returns the response data (token is set as HTTP cookie)
export const login = async (email: string, password: string) => {
    console.log("Logging in...", email, password);
    const response = await api.post(`/auth/login`, { email, password });
    return response.data;
};

// Logout Function
// Makes a POST request to the logout route
// Returns the response data (token is removed in HTTP cookie)
export const logout = async () => {
    console.log("Logging out...");
    const response = await api.post(`/auth/logout`);
    return response.data;
};



// Refresh Function
// Makes a POST request to the refresh route
// Returns the response data (new access token is set as HTTP cookie)
export const refresh = async () => {
    console.log("Refreshing token...");
    const response = await refreshApi.post(`/auth/refresh`);
    return response.data;
};