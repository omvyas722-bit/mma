import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CommandPalette from './CommandPalette';

const renderPalette = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CommandPalette', () => {
  it('renders when isOpen is true', () => {
    renderPalette(<CommandPalette isOpen={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText(/search|command|type/i)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderPalette(<CommandPalette isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('filters commands by search', () => {
    renderPalette(<CommandPalette isOpen={true} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/search|command|type/i);
    fireEvent.change(input, { target: { value: 'Dashboard' } });
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    renderPalette(<CommandPalette isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText(/search|command|type/i), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows categories', () => {
    renderPalette(<CommandPalette isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });
});
