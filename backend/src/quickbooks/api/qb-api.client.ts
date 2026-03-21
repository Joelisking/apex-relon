export class QbApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(`QB API ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async get(path: string): Promise<any> {
    return this.request(path);
  }

  async post(path: string, body: unknown): Promise<any> {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  }
}
