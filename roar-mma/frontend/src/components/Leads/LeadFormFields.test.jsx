import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import {
  initialLeadForm, validateLeadForm,
  LeadNameFields, LeadContactFields, LeadSourceFields, LeadNotesFields, LeadUtmFields,
} from './LeadFormFields';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const QWrap = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('initialLeadForm', () => {
  it('has all required default fields', () => {
    expect(initialLeadForm).toEqual({
      first_name: '', last_name: '', email: '', phone: '',
      source: 'website', location: 'rockingham', interests: '', notes: '',
      utm_source: '', utm_medium: '', utm_campaign: '',
    });
  });
});

describe('validateLeadForm', () => {
  it('returns errors for empty required fields', () => {
    const errors = validateLeadForm({ first_name: '', last_name: '', phone: '' });
    expect(errors.first_name).toBe('First name is required');
    expect(errors.last_name).toBe('Last name is required');
    expect(errors.phone).toBe('Phone is required');
  });

  it('returns no errors for valid form', () => {
    const errors = validateLeadForm({ first_name: 'John', last_name: 'Doe', phone: '0400123456' });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates source when in extraFields', () => {
    const errors = validateLeadForm({ first_name: 'John', last_name: 'Doe', phone: '0400123456', source: '' }, ['source']);
    expect(errors.source).toBe('Source is required');
  });

  it('validates status when in extraFields', () => {
    const errors = validateLeadForm({ first_name: 'John', last_name: 'Doe', phone: '0400123456', status: '' }, ['status']);
    expect(errors.status).toBe('Status is required');
  });

  it('passes validation with extra fields provided', () => {
    const errors = validateLeadForm(
      { first_name: 'John', last_name: 'Doe', phone: '0400123456', source: 'website', status: 'new' },
      ['source', 'status'],
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('requires first_name to be non-empty after trim', () => {
    const errors = validateLeadForm({ first_name: '  ', last_name: 'Doe', phone: '0400123456' });
    expect(errors.first_name).toBeDefined();
  });
});

describe('LeadNameFields', () => {
  const defaultProps = { formData: { first_name: '', last_name: '' }, errors: {}, handleChange: vi.fn() };

  it('renders name inputs with required markers', () => {
    render(<LeadNameFields {...defaultProps} />);
    expect(document.querySelector('input[name="first_name"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="last_name"]')).toBeInTheDocument();
    expect(screen.getByText('First Name *')).toBeInTheDocument();
  });

  it('displays values', () => {
    render(<LeadNameFields {...defaultProps} formData={{ first_name: 'John', last_name: 'Doe' }} />);
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
  });

  it('shows errors', () => {
    render(<LeadNameFields {...defaultProps} errors={{ first_name: 'Required', last_name: 'Required' }} />);
    const errors = screen.getAllByText('Required');
    expect(errors.length).toBe(2);
  });

  it('calls handleChange', () => {
    const handleChange = vi.fn();
    render(<LeadNameFields {...defaultProps} handleChange={handleChange} />);
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'Jane' } });
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('LeadContactFields', () => {
  const defaultProps = { formData: { email: '', phone: '' }, errors: {}, handleChange: vi.fn() };

  it('renders email and phone by default', () => {
    render(<LeadContactFields {...defaultProps} />);
    expect(document.querySelector('input[name="email"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="phone"]')).toBeInTheDocument();
  });

  it('hides email when showEmail is false', () => {
    render(<LeadContactFields {...defaultProps} showEmail={false} />);
    expect(document.querySelector('input[name="email"]')).not.toBeInTheDocument();
  });

  it('shows phone errors', () => {
    render(<LeadContactFields {...defaultProps} errors={{ phone: 'Required' }} />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows phone placeholder', () => {
    render(<LeadContactFields {...defaultProps} />);
    expect(screen.getByPlaceholderText('0400123456')).toBeInTheDocument();
  });
});

describe('LeadSourceFields', () => {
  it('renders source and location selects', () => {
    render(<LeadSourceFields formData={{ source: 'website', location: 'rockingham' }} handleChange={vi.fn()} />, { wrapper: QWrap });
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Preferred Location')).toBeInTheDocument();
  });
});

describe('LeadNotesFields', () => {
  it('renders interests and notes textareas', () => {
    render(<LeadNotesFields formData={{ interests: '', notes: '' }} handleChange={vi.fn()} />);
    expect(screen.getByText('Interests')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('shows interests placeholder', () => {
    render(<LeadNotesFields formData={{ interests: '', notes: '' }} handleChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/BJJ|Muay Thai|MMA/i)).toBeInTheDocument();
  });
});

describe('LeadUtmFields', () => {
  it('renders UTM collapsed by default', () => {
    render(<LeadUtmFields formData={{}} handleChange={vi.fn()} />);
    expect(screen.getByText('UTM Tracking (optional)')).toBeInTheDocument();
  });

  it('renders UTM input fields when expanded', () => {
    render(<LeadUtmFields formData={{ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'summer' }} handleChange={vi.fn()} />);
    expect(screen.getByDisplayValue('google')).toBeInTheDocument();
    expect(screen.getByDisplayValue('cpc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('summer')).toBeInTheDocument();
  });
});
