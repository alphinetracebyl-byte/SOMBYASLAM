import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyOtpPage from '../VerifyOtpPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('@/api/auth.api', () => ({
  authApi: {
    verifyOtp: vi.fn(),
  },
}));

const renderPage = (search = '?userId=u-123&phoneLast4=5678') =>
  render(
    <MemoryRouter initialEntries={[`/verify-otp${search}`]}>
      <Routes>
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('VerifyOtpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders OTP input and last-4 digits hint', () => {
    renderPage();
    expect(screen.getByLabelText(/otp code/i)).toBeInTheDocument();
    expect(screen.getByText(/\*\*\*\*5678/)).toBeInTheDocument();
  });

  it('shows error when OTP is not 6 digits', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/otp code/i), '123');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/6-digit/i);
    });
  });

  it('shows error when OTP contains non-digits', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/otp code/i), 'abc123');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => {
      expect(screen.getByText(/digits only/i)).toBeInTheDocument();
    });
  });

  it('calls verifyOtp API and shows success on valid OTP', async () => {
    const { authApi } = await import('@/api/auth.api');
    vi.mocked(authApi.verifyOtp).mockResolvedValueOnce(undefined as never);

    renderPage();
    await userEvent.type(screen.getByLabelText(/otp code/i), '640495');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({ userId: 'u-123', otp: '640495' });
      expect(screen.getByRole('status')).toHaveTextContent(/verified/i);
    });
  });

  it('shows server error on invalid OTP', async () => {
    const { authApi } = await import('@/api/auth.api');
    const axiosError = Object.assign(new Error('bad otp'), {
      isAxiosError: true,
      response: { data: { message: 'Invalid or expired OTP' }, status: 400 },
    });
    vi.mocked(authApi.verifyOtp).mockRejectedValueOnce(axiosError);

    renderPage();
    await userEvent.type(screen.getByLabelText(/otp code/i), '000000');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid or expired OTP');
    });
  });
});
