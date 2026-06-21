import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator, DropdownLabel, SimpleDropdown } from './index';

describe('Dropdown', () => {
  it('renders trigger', () => {
    render(<Dropdown><DropdownTrigger>Menu</DropdownTrigger></Dropdown>);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('opens content on trigger click', () => {
    render(<Dropdown><DropdownTrigger>Open</DropdownTrigger><DropdownContent><DropdownItem>Item</DropdownItem></DropdownContent></Dropdown>);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Item')).toBeInTheDocument();
  });

  it('renders disabled state on DropdownItem', () => {
    render(<Dropdown><DropdownTrigger>M</DropdownTrigger><DropdownContent><DropdownItem disabled>Disabled</DropdownItem></DropdownContent></Dropdown>);
    fireEvent.click(screen.getByText('M'));
    const btn = screen.getByText('Disabled').closest('button');
    expect(btn).toBeDisabled();
  });
});

describe('DropdownItem', () => {
  it('renders children', async () => {
    render(<Dropdown><DropdownTrigger>M</DropdownTrigger><DropdownContent><DropdownItem>Item A</DropdownItem></DropdownContent></Dropdown>);
    fireEvent.click(screen.getByText('M'));
    expect(screen.getByText('Item A')).toBeInTheDocument();
  });
});

describe('SimpleDropdown', () => {
  it('renders with items', () => {
    render(<SimpleDropdown trigger={<button>Actions</button>} items={[{ text: 'Edit' }, { text: 'Delete' }]} />);
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
