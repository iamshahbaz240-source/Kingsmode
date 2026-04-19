export interface User {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Session {
  id: string;
  user_id: string;
  type: 'pomodoro' | 'short_break' | 'long_break';
  duration: number;
  completed: boolean;
  started_at: string;
  ended_at?: string;
  xp_earned: number;
}

export interface Activity {
  id: string;
  user_id: string;
  category: 'work' | 'study' | 'break' | 'fitness' | 'social';
  title?: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
}

export type FocusMode = 'low' | 'medium' | 'hard';
