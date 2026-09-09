const API_BASE_URL = 'http://localhost:4000/api';

const getHeaders = () => {
  let token = '';
  try {
    token = localStorage.getItem('jwt_token') || '';
  } catch (e) {}
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (res: Response, endpoint: string) => {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("localUser");
    localStorage.removeItem("jwt_token");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/login";
    throw new Error(`Authentication failed (${res.status})`);
  }
  if (!res.ok) {
    let errorMessage = `${res.status} ${endpoint} failed`;
    try {
      const errorData = await res.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch (e) {
      // Ignore if response is not JSON
    }
    throw new Error(errorMessage);
  }
  
  // DELETE requests might not return JSON
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return { data: null, error: null };
  }
  
  return { data: await res.json(), error: null };
};

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders()
    });
    return handleResponse(res, `GET ${endpoint}`);
  },

  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res, `POST ${endpoint}`);
  },

  put: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res, `PUT ${endpoint}`);
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const result = await handleResponse(res, `DELETE ${endpoint}`);
    return { error: null };
  },
};
