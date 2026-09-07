const API_BASE_URL = 'http://localhost:4000/api';

const getHeaders = () => {
  let email = 'System';
  try {
    const userStr = localStorage.getItem('localUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.email) email = user.email;
    }
  } catch (e) {}
  
  return {
    'Content-Type': 'application/json',
    'X-User-Email': email
  };
};

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'X-User-Email': getHeaders()['X-User-Email'] }
    });
    if (!res.ok) throw new Error(`GET ${endpoint} failed`);
    return { data: await res.json(), error: null };
  },

  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${endpoint} failed`);
    return { data: await res.json(), error: null };
  },

  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`PUT ${endpoint} failed`);
    return { data: await res.json(), error: null };
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'X-User-Email': getHeaders()['X-User-Email'] }
    });
    if (!res.ok) throw new Error(`DELETE ${endpoint} failed`);
    return { error: null };
  },
};
