import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ClassFormFields, initialClassForm, validateClassForm } from './ClassFormFields';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const QWrap = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

describe('initialClassForm', () => {
  it('has all default fields', () => {
    expect(initialClassForm).toEqual({
      name: '', description: '', instructor: '', location: '',
      day_of_week: '', start_time: '', end_time: '', max_capacity: '', class_type: '',
      fighter_only: false, min_belt: '',
    });
  });
});

describe('validateClassForm', () => {
  it('returns errors for empty required fields', () => {
    const errors = validateClassForm({
      name: '', instructor: '', location: '', day_of_week: '',
      start_time: '', end_time: '', class_type: '',
    });
    expect(errors.name).toBe('Class name is required');
    expect(errors.instructor).toBe('Instructor is required');
    expect(errors.location).toBe('Location is required');
    expect(errors.day_of_week).toBe('Day of week is required');
    expect(errors.start_time).toBe('Start time is required');
    expect(errors.end_time).toBe('End time is required');
    expect(errors.class_type).toBe('Class type is required');
  });

  it('returns no errors for valid form', () => {
    const errors = validateClassForm({
      name: 'BJJ', instructor: 'Coach', location: 'rockingham',
      day_of_week: '1', start_time: '09:00', end_time: '10:00', class_type: 'bjj',
    });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('validates end time after start time', () => {
    const errors = validateClassForm({
      name: 'BJJ', instructor: 'Coach', location: 'rockingham',
      day_of_week: '1', start_time: '10:00', end_time: '09:00', class_type: 'bjj',
    });
    expect(errors.end_time).toBe('End time must be after start time');
  });

  it('validates end time same as start time', () => {
    const errors = validateClassForm({
      name: 'BJJ', instructor: 'Coach', location: 'rockingham',
      day_of_week: '1', start_time: '10:00', end_time: '10:00', class_type: 'bjj',
    });
    expect(errors.end_time).toBe('End time must be after start time');
  });

  it('validates capacity must be at least 1', () => {
    const errors = validateClassForm({
      name: 'BJJ', instructor: 'Coach', location: 'rockingham',
      day_of_week: '1', start_time: '09:00', end_time: '10:00',
      class_type: 'bjj', max_capacity: '0',
    });
    expect(errors.max_capacity).toBe('Capacity must be at least 1');
  });

  it('passes validation with empty capacity', () => {
    const errors = validateClassForm({
      name: 'BJJ', instructor: 'Coach', location: 'rockingham',
      day_of_week: '1', start_time: '09:00', end_time: '10:00',
      class_type: 'bjj', max_capacity: '',
    });
    expect(errors.max_capacity).toBeUndefined();
  });

  it('passes validation with valid capacity', () => {
    const errors = validateClassForm({
      name: 'BJJ', instructor: 'Coach', location: 'rockingham',
      day_of_week: '1', start_time: '09:00', end_time: '10:00',
      class_type: 'bjj', max_capacity: '30',
    });
    expect(errors.max_capacity).toBeUndefined();
  });
});

describe('ClassFormFields', () => {
  const defaultProps = { formData: initialClassForm, errors: {}, handleChange: vi.fn() };

  it('renders all basic info fields', () => {
    render(<ClassFormFields {...defaultProps} />, { wrapper: QWrap });
    expect(document.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(document.querySelector('textarea[name="description"]')).toBeInTheDocument();
    expect(document.querySelector('select[name="class_type"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="instructor"]')).toBeInTheDocument();
  });

  it('renders all schedule fields', () => {
    render(<ClassFormFields {...defaultProps} />, { wrapper: QWrap });
    expect(document.querySelector('select[name="day_of_week"]')).toBeInTheDocument();
    expect(document.querySelector('select[name="location"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="start_time"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="end_time"]')).toBeInTheDocument();
    expect(document.querySelector('input[name="max_capacity"]')).toBeInTheDocument();
    expect(document.querySelector('select[name="min_belt"]')).toBeInTheDocument();
  });

  it('hides day of week when hideDayOfWeek is true', () => {
    render(<ClassFormFields {...defaultProps} hideDayOfWeek={true} />, { wrapper: QWrap });
    expect(document.querySelector('select[name="day_of_week"]')).not.toBeInTheDocument();
  });

  it('displays pre-filled values', () => {
    const formData = {
      name: 'Muay Thai', description: 'Striking class', instructor: 'Coach B',
      location: 'bibra_lake', day_of_week: '2', start_time: '18:00', end_time: '19:00',
      max_capacity: '25', class_type: 'muay_thai', min_belt: 'blue', fighter_only: true,
    };
    render(<ClassFormFields {...defaultProps} formData={formData} />, { wrapper: QWrap });
    expect(document.querySelector('input[name="name"]')).toHaveValue('Muay Thai');
    expect(document.querySelector('textarea[name="description"]')).toHaveValue('Striking class');
    expect(document.querySelector('input[name="instructor"]')).toHaveValue('Coach B');
    expect(document.querySelector('input[name="max_capacity"]')).toHaveValue(25);
  });

  it('renders section headers', () => {
    render(<ClassFormFields {...defaultProps} />, { wrapper: QWrap });
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('shows validation errors', () => {
    const errors = { name: 'Required', instructor: 'Required' };
    render(<ClassFormFields {...defaultProps} errors={errors} />, { wrapper: QWrap });
    const errs = screen.getAllByText('Required');
    expect(errs.length).toBe(2);
  });

  it('renders fighter-only checkbox', () => {
    render(<ClassFormFields {...defaultProps} />, { wrapper: QWrap });
    expect(screen.getByText(/Fighters only/i)).toBeInTheDocument();
  });

  it('checkbox reflects fighter_only value', () => {
    const formData = { ...initialClassForm, fighter_only: true };
    render(<ClassFormFields {...defaultProps} formData={formData} />, { wrapper: QWrap });
    expect(document.querySelector('input[name="fighter_only"]').checked).toBe(true);
  });

  it('renders class name placeholder', () => {
    render(<ClassFormFields {...defaultProps} />, { wrapper: QWrap });
    expect(screen.getByPlaceholderText('e.g., BJJ Fundamentals')).toBeInTheDocument();
  });

  it('calls handleChange on input', () => {
    const handleChange = vi.fn();
    render(<ClassFormFields {...defaultProps} handleChange={handleChange} />, { wrapper: QWrap });
    fireEvent.change(document.querySelector('input[name="name"]'), { target: { name: 'name', value: 'Boxing' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders all day options', () => {
    render(<ClassFormFields {...defaultProps} />, { wrapper: QWrap });
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByText('Thursday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
  });
});
