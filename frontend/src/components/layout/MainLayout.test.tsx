import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';

vi.mock('@/components/layout/Header', () => ({
  Header: vi.fn(() => <div data-testid="header" />),
}));
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: vi.fn(() => <div data-testid="sidebar" />),
}));

function TestOutlet() {
  return <div data-testid="outlet-content" />;
}

function buildRouter() {
  return createMemoryRouter(
    [
      {
        element: <MainLayout />,
        children: [{ path: '/', element: <TestOutlet /> }],
      },
    ],
    { initialEntries: ['/'] }
  );
}

describe('MainLayout', () => {
  it('should render Header, Sidebar and Outlet', () => {
    render(<RouterProvider router={buildRouter()} />);

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('should pass onMenuClick to Header', () => {
    render(<RouterProvider router={buildRouter()} />);

    const props = (Header as any).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        onMenuClick: expect.any(Function),
      })
    );
  });
});