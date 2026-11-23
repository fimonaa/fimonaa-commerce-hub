export type BusinessRole =
  | "owner"
  | "admin"
  | "inventory_manager"
  | "operator"
  | "viewer";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface AccessibleBusiness {
  id: string;
  name: string;
  slug: string;
  role: BusinessRole;
}

export interface MyBusinessesResponse {
  data: AccessibleBusiness[];
}
