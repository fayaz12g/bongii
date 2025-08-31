// utils/config.js

const SERVER_ADDRESSES = {
  local: "http://localhost:3001",
  production: "https://bongii.fly.dev"
};

// Default server
let serverBase = SERVER_ADDRESSES.local;

// Function to set server
export const setServerBase = (env) => {
  if (SERVER_ADDRESSES[env]) {
    serverBase = SERVER_ADDRESSES[env];
  }
};

// Function to get server path including /api
export const getServerPath = () => `${serverBase}/api`;
