/**
 * Authentication types matching backend contract
 */

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'admin';
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface MeResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'admin';
}

export interface RefreshRequest {
  refresh: string;
}

export interface RefreshResponse {
  access: string;
}