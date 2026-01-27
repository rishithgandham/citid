// Authentication Service 
// makes API calls for authentication routes (login, register)

import axios from 'axios';

const API_URL = 'http://localhost:5000/auth';

// Configure axios to send cookies with requests (needed for HTTP-only cookies)
axios.defaults.withCredentials = true;

// Register Function
// Makes a POST request to the register route with the email and password
// Returns the response data (token is set as HTTP cookie)
export const register = async (email: string, password: string) => {
    console.log("Registering user...", email, password);
    const response = await axios.post(`${API_URL}/register`, { email, password });
    return response.data;
};

// Login Function
// Makes a POST request to the login route with the email and password
// Returns the response data (token is set as HTTP cookie)
export const login = async (email: string, password: string) => {
    console.log("Logging in...", email, password);
    const response = await axios.post(`${API_URL}/login`, { email, password });
    return response.data;
};


