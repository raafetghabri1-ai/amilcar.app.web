export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type UserRole = "admin" | "worker" | "client";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  specialty: string | null;
  salary: number | null;
  is_vip: boolean;
  vip_discount_percent: number;
  vip_since: string | null;
  created_at: string;
}

export interface WorkerStats {
  worker_id: number;
  full_name: string;
  specialty: string | null;
  total_days: number;
  present_days: number;
  attendance_rate: number;
  completed_bookings: number;
  performance_points: number;
}

export interface Product {
  id: number;
  name: string;
  name_ar: string | null;
  description: string | null;
  category: string;
  price: number;
  cost_price: number | null;
  unit: string;
  stock_quantity: number;
  min_stock_alert: number;
  consumption_per_car: number | null;
  cars_estimate: number | null;
  sku: string | null;
  image_url: string | null;
  is_active: boolean;
  service_id: number | null;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  rating: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseLog {
  id: number;
  product_id: number;
  supplier_id: number | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  purchased_at: string;
  product_name: string | null;
  supplier_name: string | null;
}

export interface ServiceItem {
  id: number;
  name: string;
  name_ar: string | null;
  description: string | null;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

export interface Vehicle {
  id: number;
  client_id: number;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  plate_number: string;
  created_at: string;
}

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "card" | "bank_transfer";

export interface BookingDetail {
  id: number;
  client_id: number;
  vehicle_id: number | null;
  worker_id: number | null;
  service_id: number;
  booking_date: string;
  booking_time: string;
  status: BookingStatus;
  total_price: number;
  payment_method: PaymentMethod | null;
  is_paid: boolean;
  notes: string | null;
  created_at: string;
  client_name: string | null;
  client_phone: string | null;
  service_name: string | null;
  service_name_ar: string | null;
  service_duration: number | null;
  vehicle_info: string | null;
  worker_name: string | null;
  is_vip: boolean;
  vip_discount_percent: number;
  original_price: number | null;
}

export interface ClientHistory {
  client_id: number;
  full_name: string;
  email: string;
  phone: string;
  is_vip: boolean;
  vip_discount_percent: number;
  vip_since: string | null;
  vehicles: Vehicle[];
  bookings: BookingDetail[];
  total_spent: number;
  total_visits: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string | null;
  product_name_ar: string | null;
  quantity: number;
  unit_price: number;
}

export interface OrderOut {
  id: number;
  client_id: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "خطأ في الاتصال" }));
      throw new Error(error.detail || `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ──── Auth ────
  async login(email: string, password: string): Promise<LoginResponse> {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "خطأ في الاتصال" }));
      throw new Error(error.detail || "فشل تسجيل الدخول");
    }

    return res.json();
  }

  async getMe(): Promise<User> {
    return this.request<User>("/api/v1/auth/me");
  }

  // ──── Generic CRUD ────
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<void> {
    return this.request<void>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();
