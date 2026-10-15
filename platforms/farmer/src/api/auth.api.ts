import { apiClient } from './client';

export interface RegisterRequest {
  fullName: string;
  phoneE164: string;
  nationalId: string;
  region: string;
  premisesId?: string | null;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  phoneLast4: string;
  message: string;
}

export interface VerifyOtpRequest {
  userId: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  phoneE164: string;
}

export interface ResetPasswordRequest {
  phoneE164: string;
  otp: string;
  newPassword: string;
}

export interface InvitationAcceptRequest {
  fullName: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<RegisterResponse>('/auth/register', data),

  verifyOtp: (data: VerifyOtpRequest) =>
    apiClient.post<void>('/auth/verify-otp', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<void>('/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<void>('/auth/reset-password', data),

  acceptInvitation: (code: string, data: InvitationAcceptRequest) =>
    apiClient.post<void>(`/invitations/${code}/accept`, data),
};
