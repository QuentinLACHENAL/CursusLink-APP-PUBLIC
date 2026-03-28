import type { 
  User, 
  UserProfile, 
  LeaderboardEntry, 
  GraphData, 
  GraphNode,
  Correction,
  Coalition,
  ShopItem,
  GalaxyStructure
} from '../types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface RequestOptions {
  method?: RequestMethod;
  body?: any;
  token?: string | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiService {
  private getHeaders(token?: string | null, isFormData: boolean = false): HeadersInit {
    const headers: HeadersInit = {};
    
    // Auth header
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Content-Type (skip for FormData as browser sets boundary)
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, token, isFormData = false } = options;
    
    // Ensure endpoint starts with / if not absolute URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const config: RequestInit = {
      method,
      headers: { ...this.getHeaders(token, isFormData), ...options.headers },
    };

    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          window.location.href = '/login';
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      // Handle non-OK responses
      if (!response.ok) {
        // Clone the response to safely try reading it
        const responseText = await response.text();
        let errorMessage = response.statusText;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use the text we already read
          if (responseText) errorMessage = responseText;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response
      // Check if response has content
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
      } else {
        // Return text or null if not JSON
        return (await response.text()) as unknown as T;
      }
    } catch (error: any) {
      console.error(`API Request Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  // ===========================================
  // GENERIC METHODS
  // ===========================================

  get<T>(endpoint: string, token?: string | null) {
    return this.request<T>(endpoint, { method: 'GET', token });
  }

  post<T>(endpoint: string, body: any, token?: string | null, isFormData: boolean = false) {
    return this.request<T>(endpoint, { method: 'POST', body, token, isFormData });
  }

  patch<T>(endpoint: string, body: any, token?: string | null) {
    return this.request<T>(endpoint, { method: 'PATCH', body, token });
  }

  delete<T>(endpoint: string, token?: string | null) {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }

  // ===========================================
  // TYPED ENDPOINTS - USERS
  // ===========================================

  getUsers(token?: string | null) {
    return this.get<User[]>('/users', token);
  }

  getUserProfile(userId: string) {
    return this.get<UserProfile>(`/users/profile/${userId}`);
  }

  getPublicProfile(userId: string) {
    return this.get<UserProfile>(`/users/public-profile/${userId}`);
  }

  updateProfile(data: Partial<User>, token?: string | null) {
    return this.patch<User>('/users/profile', data, token);
  }

  updateEvaluationPoints(userId: string, delta: number, token?: string | null) {
    return this.patch<User>(`/users/${userId}/evaluation-points`, { delta }, token);
  }

  getLeaderboard(school?: string) {
    const params = school ? `?school=${encodeURIComponent(school)}` : '';
    return this.get<LeaderboardEntry[]>(`/users/leaderboard${params}`);
  }

  searchUsers(query: string, token?: string | null) {
    return this.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`, token);
  }

  // ===========================================
  // TYPED ENDPOINTS - GRAPH
  // ===========================================

  getGraph(userId?: string) {
    const params = userId ? `?userId=${userId}` : '';
    return this.get<GraphData>(`/graph${params}`);
  }

  getNodeById(nodeId: string) {
    return this.get<GraphNode>(`/graph/node/${nodeId}`);
  }

  getGalaxyStructure(token?: string | null) {
    return this.get<GalaxyStructure[]>('/admin/structure', token);
  }

  createNode(data: Partial<GraphNode>, token?: string | null) {
    return this.post<GraphNode>('/graph/node', data, token);
  }

  updateNode(nodeId: string, data: Partial<GraphNode>, token?: string | null) {
    return this.patch<GraphNode>(`/graph/node/${nodeId}`, data, token);
  }

  deleteNode(nodeId: string, token?: string | null) {
    return this.delete<{ success: boolean }>(`/graph/node/${nodeId}`, token);
  }

  deleteGalaxy(galaxyName: string, token?: string | null) {
    return this.delete<{ success: boolean; deletedCount: number }>(`/graph/galaxy/${encodeURIComponent(galaxyName)}`, token);
  }

  deleteSystem(galaxyName: string, systemName: string, token?: string | null) {
    return this.delete<{ success: boolean; deletedCount: number }>(`/graph/system/${encodeURIComponent(galaxyName)}/${encodeURIComponent(systemName)}`, token);
  }

  savePositions(positions: { id: string; x: number; y: number }[], token?: string | null) {
    return this.post<{ success: boolean }>('/graph/positions', { positions }, token);
  }

  validateSkill(skillId: string, xp: number, token?: string | null) {
    return this.post<{ message: string; newXp: number }>('/graph/validate', { skillId, xp }, token);
  }

  verifyExercise(nodeId: string, answers: Record<string, any>, token?: string | null) {
    return this.post<{ success: boolean; score: number; passed: boolean; details: any[] }>('/exercises/verify', { nodeId, answers }, token);
  }

  createRelationship(source: string, target: string, type: string, token?: string | null) {
    return this.post<{ success: boolean }>('/graph/relationship', { source, target, type }, token);
  }

  uploadNodeFiles(nodeId: string, formData: FormData, token?: string | null) {
    return this.post<any>(`/uploads/node/${nodeId}/multiple`, formData, token, true);
  }

  // ===========================================
  // TYPED ENDPOINTS - CORRECTIONS
  // ===========================================

  getAvailableCorrections(userId: string, token?: string | null) {
    return this.get<Correction[]>(`/corrections/available/${userId}`, token);
  }

  getMyRequests(userId: string, token?: string | null) {
    return this.get<Correction[]>(`/corrections/my-requests/${userId}`, token);
  }

  getGivenCorrections(userId: string, token?: string | null) {
    return this.get<Correction[]>(`/corrections/given/${userId}`, token);
  }

  requestCorrection(projectId: string, submissionData?: string, token?: string | null) {
    return this.post<Correction>('/corrections/request', { projectId, submissionData }, token);
  }

  submitCorrection(correctionId: string, mark: number, comments: string, token?: string | null) {
    return this.post<Correction>('/corrections/submit', { correctionId, mark, comments }, token);
  }

  getCorrectionById(id: string, token?: string | null) {
    return this.get<Correction>(`/corrections/${id}`, token);
  }

  // ===========================================
  // TYPED ENDPOINTS - SHOP
  // ===========================================

  getShopCatalog() {
    return this.get<ShopItem[]>('/shop/catalog');
  }

  purchaseItem(itemId: string, token?: string | null) {
    return this.post<{ success: boolean; credits: number }>('/shop/purchase', { itemId }, token);
  }

  equipItem(itemId: string, token?: string | null) {
    return this.post<{ success: boolean }>('/shop/equip', { itemId }, token);
  }

  // ===========================================
  // TYPED ENDPOINTS - COALITIONS
  // ===========================================

  getCoalitions() {
    return this.get<Coalition[]>('/coalitions');
  }

  getCoalitionLeaderboard(school?: string) {
    const params = school ? `?school=${encodeURIComponent(school)}` : '';
    return this.get<Coalition[]>(`/coalitions/leaderboard${params}`);
  }
}

export const api = new ApiService();
