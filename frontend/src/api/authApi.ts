import axiosClient from './axiosClient';
import type { AuthResponse, LoginRequest, RegisterRequest, MeResponse } from '@/types/auth';

export const authApi = {
  login(data: LoginRequest) {
    return axiosClient.post<AuthResponse>('auth/login/', data);
  },

  register(data: RegisterRequest) {
    return axiosClient.post<AuthResponse>('auth/register/', data);
  },

  me() {
    return axiosClient.get<MeResponse>('auth/me/');
  },
};