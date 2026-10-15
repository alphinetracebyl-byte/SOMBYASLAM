export const colors = {
  brand: {
    green: {
      900: '#0f3d22',
      700: '#1a6b3a',
      500: '#2d9e5f',
      300: '#6dcf9a',
      100: '#d4f5e2',
    },
    blue: {
      900: '#0d2a52',
      700: '#1a4a8a',
      500: '#2d6fc4',
      300: '#7ab3e8',
      100: '#d6e9f9',
    },
    maroon: {
      900: '#2e0a0a',
      700: '#5c1a1a',
      500: '#9e2d2d',
      300: '#d47c7c',
      100: '#f9d6d6',
    },
  },
  neutral: {
    900: '#111827',
    700: '#374151',
    500: '#6b7280',
    300: '#d1d5db',
    100: '#f9fafb',
  },
  semantic: {
    success: '#166534',
    warning: '#92400e',
    error: '#991b1b',
    info: '#1e40af',
  },
} as const;

export type Colors = typeof colors;
