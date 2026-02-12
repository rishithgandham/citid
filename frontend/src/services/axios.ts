import axios from "axios";
import { refresh } from "./auth";


// Initialize axios instances for the API and refresh API endpoints
// withCredentials is true to send the HTTP only cookies with the request

// Axios used because of it's interceptors and ability to handle HTTP only cookies



// TODO: change baseURL to enviorment variable
export const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true
});

export const refreshApi = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true
});


// Interceptor for the API endpoint to refresh the token if it is expired, this interceptor is only attached to the api instance, not the refreshApi instance
// Any request that returns a 401 error will be retried with the refresh endpoint called, if it fails again, the request is rejected
api.interceptors.response.use(
    res => res,
    async error => {
      const originalRequest = error.config;
  
      if (error.response?.status === 401) {
        try {
            await refresh(); // calls backend, sets cookie
            console.log("retrying request")
          return refreshApi.request(originalRequest); // retry original request
        } catch (refreshErr) {
          console.log("error refreshing token", refreshErr)
          return Promise.reject(refreshErr);
        }
      }
  
      return Promise.reject(error);
    }
  );
  