import axios from 'axios';

export const apiClient = axios.create({
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});
