import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('@/api/auth.api', () => ({
  authApi: {
    register: vi.fn(),
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the registration form fields', () => {
    renderPage();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('shows name validation error when name is too short', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/full name/i), 'Ab');
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('shows phone validation error for non-Somali number', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/full name/i), 'Hassan Mohamed');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0612345678');
    await userEvent.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid somali/i)).toBeInTheDocument();
    });
  });

  it('calls register API and navigates to verify-otp on success', async () => {
    const { authApi } = await import('@/api/auth.api');
    vi.mocked(authApi.register).mockResolvedValueOnce({
      data: { userId: 'u-123', phoneLast4: '5678', message: 'OTP sent' },
    } as Awaited<ReturnType<typeof authApi.register>>);

    renderPage();
    await userEvent.type(screen.getByLabelText(/full name/i), 'Hassan Mohamed');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+252612345678');
    await userEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        fullName: 'Hassan Mohamed',
        phoneE164: '+252612345678',
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        '/verify-otp?userId=u-123&phoneLast4=5678',
      );
    });
  });

  it('shows server error when API call fails', async () => {
    const { authApi } = await import('@/api/auth.api');
    const axiosError = Object.assign(new Error('conflict'), {
      isAxiosError: true,
      response: { data: { message: 'Phone number is already registered' }, status: 409 },
    });
    vi.mocked(authApi.register).mockRejectedValueOnce(axiosError);

    renderPage();
    await userEvent.type(screen.getByLabelText(/full name/i), 'Hassan Mohamed');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+252612345678');
    await userEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Phone number is already registered',
      );
    });
  });
});
