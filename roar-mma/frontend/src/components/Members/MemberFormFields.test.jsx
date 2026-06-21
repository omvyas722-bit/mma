import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { PersonalInfoFields, EmergencyContactFields, MedicalGoalsFields } from './MemberFormFields';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('PersonalInfoFields', () => {
  const base = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '' };
  const defaultProps = { formData: base, errors: {}, handleChange: vi.fn() };

  it('renders all personal info fields', () => {
    render(<PersonalInfoFields {...defaultProps} />, { wrapper: Wrapper });
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBe(5);
  });

  it('displays pre-filled values', () => {
    const formData = { first_name: 'John', last_name: 'Doe', email: 'john@test.com', phone: '0400123456', date_of_birth: '1990-01-01' };
    render(<PersonalInfoFields {...defaultProps} formData={formData} />, { wrapper: Wrapper });
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0400123456')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1990-01-01')).toBeInTheDocument();
  });

  it('shows required asterisks on required fields', () => {
    render(<PersonalInfoFields {...defaultProps} />, { wrapper: Wrapper });
    const labels = screen.getAllByText(/\*/);
    expect(labels.length).toBe(4);
  });

  it('displays validation errors', () => {
    const errors = { first_name: 'Required', email: 'Invalid email' };
    render(<PersonalInfoFields {...defaultProps} errors={errors} />, { wrapper: Wrapper });
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('shows phone placeholder', () => {
    render(<PersonalInfoFields {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByPlaceholderText('0400123456')).toBeInTheDocument();
  });

  it('applies error border class on fields with errors', () => {
    const errors = { first_name: 'Required' };
    render(<PersonalInfoFields {...defaultProps} errors={errors} />, { wrapper: Wrapper });
    const input = document.querySelector('input[name="first_name"]');
    expect(input.className).toContain('border-red-500');
  });

  it('calls handleChange on input', () => {
    const handleChange = vi.fn();
    render(<PersonalInfoFields {...defaultProps} handleChange={handleChange} />, { wrapper: Wrapper });
    fireEvent.change(document.querySelector('input[name="first_name"]'), { target: { name: 'first_name', value: 'Jane' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('accepts date of birth as date input type', () => {
    render(<PersonalInfoFields {...defaultProps} />, { wrapper: Wrapper });
    expect(document.querySelector('input[name="date_of_birth"]')).toHaveAttribute('type', 'date');
  });

  it('accepts email as email input type', () => {
    render(<PersonalInfoFields {...defaultProps} />, { wrapper: Wrapper });
    expect(document.querySelector('input[name="email"]')).toHaveAttribute('type', 'email');
  });

  it('accepts phone as tel input type', () => {
    render(<PersonalInfoFields {...defaultProps} />, { wrapper: Wrapper });
    expect(document.querySelector('input[name="phone"]')).toHaveAttribute('type', 'tel');
  });
});

describe('EmergencyContactFields', () => {
  const defaultProps = { formData: { emergency_contact_name: '', emergency_contact_phone: '' }, handleChange: vi.fn() };

  it('renders emergency contact fields', () => {
    render(<EmergencyContactFields {...defaultProps} />);
    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBe(2);
  });

  it('displays pre-filled values', () => {
    const formData = { emergency_contact_name: 'Jane Doe', emergency_contact_phone: '0411122233' };
    render(<EmergencyContactFields {...defaultProps} formData={formData} />);
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0411122233')).toBeInTheDocument();
  });

  it('calls handleChange on input', () => {
    const handleChange = vi.fn();
    render(<EmergencyContactFields {...defaultProps} handleChange={handleChange} />);
    fireEvent.change(document.querySelector('input[name="emergency_contact_name"]'), { target: { name: 'emergency_contact_name', value: 'Jane' } });
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('MedicalGoalsFields', () => {
  const defaultProps = { formData: { medical_conditions: '', injuries: '', goals: '' }, handleChange: vi.fn() };

  it('renders all fields', () => {
    render(<MedicalGoalsFields {...defaultProps} />);
    const textareas = document.querySelectorAll('textarea');
    expect(textareas.length).toBe(2);
  });

  it('does NOT render injuries field by default', () => {
    render(<MedicalGoalsFields {...defaultProps} />);
    expect(document.querySelector('textarea[name="injuries"]')).not.toBeInTheDocument();
  });

  it('renders injuries field when showInjuries is true', () => {
    render(<MedicalGoalsFields {...defaultProps} showInjuries={true} />);
    expect(document.querySelector('textarea[name="injuries"]')).toBeInTheDocument();
  });

  it('displays pre-filled medical conditions', () => {
    const formData = { medical_conditions: 'Asthma', injuries: '', goals: 'Lose weight' };
    render(<MedicalGoalsFields {...defaultProps} formData={formData} />);
    expect(screen.getByDisplayValue('Asthma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lose weight')).toBeInTheDocument();
  });

  it('shows placeholders', () => {
    render(<MedicalGoalsFields {...defaultProps} />);
    expect(screen.getByPlaceholderText(/any medical conditions/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/fitness.training goals/i)).toBeInTheDocument();
  });

  it('shows injuries placeholder when showInjuries', () => {
    render(<MedicalGoalsFields {...defaultProps} showInjuries={true} />);
    expect(screen.getByPlaceholderText(/current or past injuries/i)).toBeInTheDocument();
  });

  it('calls handleChange on textarea input', () => {
    const handleChange = vi.fn();
    render(<MedicalGoalsFields {...defaultProps} handleChange={handleChange} />);
    fireEvent.change(document.querySelector('textarea[name="medical_conditions"]'), { target: { name: 'medical_conditions', value: 'None' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders all fields as textareas when showInjuries', () => {
    render(<MedicalGoalsFields {...defaultProps} showInjuries={true} />);
    const textareas = document.querySelectorAll('textarea');
    expect(textareas.length).toBe(3);
  });
});
