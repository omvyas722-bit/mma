import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumb, BreadcrumbWithIcons, AutoBreadcrumb } from './index';

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const items = [
  { label: 'Home', href: '/' },
  { label: 'Members', href: '/members' },
  { label: 'Profile' },
];

describe('Breadcrumb', () => {
  it('renders all items', () => {
    renderWithRouter(<Breadcrumb items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders link for items with href', () => {
    renderWithRouter(<Breadcrumb items={items} />);
    const link = screen.getByText('Home').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders last item as plain text', () => {
    renderWithRouter(<Breadcrumb items={items} />);
    const lastItem = screen.getByText('Profile');
    expect(lastItem.closest('a')).toBeNull();
    expect(lastItem.closest('span')).toBeInTheDocument();
  });

  it('shows separator between items', () => {
    renderWithRouter(<Breadcrumb items={items} separator=">" />);
    const separators = screen.getAllByText('>');
    expect(separators.length).toBe(items.length - 1);
  });
});

describe('AutoBreadcrumb', () => {
  it('renders home label', () => {
    renderWithRouter(<AutoBreadcrumb homeLabel="Home" homeHref="/" />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
