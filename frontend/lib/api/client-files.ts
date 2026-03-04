const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface FileUpload {
  id: string;
  clientId?: string;
  leadId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  gcpPath: string;
  downloadUrl: string;
  uploadedById: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

// Client-side only - synchronous cookie reading
function getTokenFromClientCookies(): string | null {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export const clientFilesApi = {
  async uploadFile(
    clientId: string,
    file: File,
    category: string = 'other'
  ): Promise<FileUpload> {
    const token = getTokenFromClientCookies();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/clients/${clientId}/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    return response.json();
  },

  async getFiles(clientId: string): Promise<FileUpload[]> {
    const token = getTokenFromClientCookies();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/clients/${clientId}/files`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch files');
    }

    return response.json();
  },

  async deleteFile(clientId: string, fileId: string): Promise<void> {
    const token = getTokenFromClientCookies();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/clients/${clientId}/files/${fileId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  },

  getDownloadUrl(clientId: string, fileId: string): string {
    return `${API_BASE}/clients/${clientId}/files/${fileId}/download`;
  },
};
