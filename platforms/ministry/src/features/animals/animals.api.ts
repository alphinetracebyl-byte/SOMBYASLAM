import { apiClient } from '@/api/client';
import type { AnimalSummary, RegistrationSubmission, PhotoRecord, PageResult } from './animals.types';

export interface AnimalSearchParams {
  status?: string;
  species?: string;
  ownerId?: string;
  page?: number;
  size?: number;
}

export async function fetchAnimals(params: AnimalSearchParams): Promise<PageResult<AnimalSummary>> {
  const res = await apiClient.get<PageResult<AnimalSummary>>('/api/animals', { params });
  return res.data;
}

export async function fetchAnimal(id: string): Promise<AnimalSummary> {
  const res = await apiClient.get<AnimalSummary>(`/api/animals/${id}`);
  return res.data;
}

export async function fetchAnimalPhotos(id: string): Promise<PhotoRecord[]> {
  const res = await apiClient.get<PhotoRecord[]>(`/api/animals/${id}/photos`);
  return res.data;
}

export interface SubmissionSearchParams {
  status?: string;
  species?: string;
  page?: number;
  size?: number;
}

export async function fetchSubmissions(params: SubmissionSearchParams): Promise<PageResult<RegistrationSubmission>> {
  const res = await apiClient.get<PageResult<RegistrationSubmission>>('/api/animal-registrations', { params });
  return res.data;
}

export async function fetchSubmission(id: string): Promise<RegistrationSubmission> {
  const res = await apiClient.get<RegistrationSubmission>(`/api/animal-registrations/${id}`);
  return res.data;
}

export async function verifySubmission(submissionId: string, officerUserId: string): Promise<void> {
  await apiClient.post(`/api/animal-registrations/${submissionId}/verify`, { officerUserId });
}

export async function rejectSubmission(submissionId: string, reason: string): Promise<void> {
  await apiClient.post(`/api/animal-registrations/${submissionId}/reject`, { reason });
}
