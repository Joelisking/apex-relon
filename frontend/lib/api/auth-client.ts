const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Response types
export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  permissions?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface MessageResponse {
  message: string;
}

// Helper to get token from cookies
function getTokenFromCookies(): string | null {
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return decodeURIComponent(value);
      }
    }
  }
  return null;
}

// Generic auth fetch wrapper
async function authFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const token = getTokenFromCookies();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Auth API methods
export const authApi = {
  // Login
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return authFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Register
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    return authFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    return authFetch<MessageResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<MessageResponse> => {
    return authFetch<MessageResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<MessageResponse> => {
    return authFetch<MessageResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    return authFetch<User>('/auth/profile');
  },
};
