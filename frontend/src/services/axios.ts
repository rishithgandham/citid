import axios from "axios";
import { refresh } from "./auth";

export const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true
});

export const refreshApi = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true
});


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
  