import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input, Textarea, Select, Checkbox, RadioGroup, Switch, FileInput, FormGroup, FormRow, FormActions, FieldError, FieldHelper } from './index';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test@example.com' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('applies error styling', () => {
    render(<Input error="Error" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('shows required indicator', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('is disabled', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('displays helper text', () => {
    render(<Input helperText="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('hides helper text when error present', () => {
    render(<Input helperText="Help" error="Error" />);
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Bio" />);
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('renders textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('shows error', () => {
    render(<Textarea error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(<Textarea helperText="Tell us about yourself" />);
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
  });

  it('sets rows', () => {
    render(<Textarea rows={8} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8');
  });

  it('shows required indicator', () => {
    render(<Textarea label="Bio" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies error style', () => {
    render(<Textarea error="Error" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });
});

describe('Select', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B', disabled: true },
  ];

  it('renders with label', () => {
    render(<Select label="Choose" options={options} />);
    expect(screen.getByLabelText('Choose')).toBeInTheDocument();
  });

  it('renders options', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('shows placeholder', () => {
    render(<Select options={options} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('shows error', () => {
    render(<Select options={options} error="Select something" />);
    expect(screen.getByText('Select something')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(<Select options={options} helperText="Pick wisely" />);
    expect(screen.getByText('Pick wisely')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<Select label="Choose" options={options} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Agree" />);
    expect(screen.getByLabelText('Agree')).toBeInTheDocument();
  });

  it('renders checkbox input', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('shows error', () => {
    render(<Checkbox error="Must agree" />);
    expect(screen.getByText('Must agree')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(<Checkbox helperText="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('handles change', () => {
    const onChange = vi.fn();
    render(<Checkbox onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
  });
});

describe('RadioGroup', () => {
  const options = [
    { value: 'm', label: 'Male' },
    { value: 'f', label: 'Female', description: 'Female option' },
  ];

  it('renders with label', () => {
    render(<RadioGroup label="Gender" options={options} />);
    expect(screen.getByText('Gender')).toBeInTheDocument();
  });

  it('renders radio options', () => {
    render(<RadioGroup name="gender" options={options} />);
    expect(screen.getByRole('radio', { name: 'Male' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Female/ })).toBeInTheDocument();
  });

  it('shows description on option', () => {
    render(<RadioGroup name="gender" options={options} />);
    expect(screen.getByText('Female option')).toBeInTheDocument();
  });

  it('checks selected value', () => {
    render(<RadioGroup name="gender" options={options} value="m" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'Male' })).toBeChecked();
  });

  it('calls onChange', () => {
    const onChange = vi.fn();
    render(<RadioGroup name="gender" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Male' }));
    expect(onChange).toHaveBeenCalledWith('m');
  });

  it('shows error', () => {
    render(<RadioGroup label="Gender" options={options} error="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(<RadioGroup label="Gender" options={options} helperText="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<RadioGroup label="Gender" options={options} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

describe('Switch', () => {
  it('renders with label', () => {
    render(<Switch label="Notifications" />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('renders switch role', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<Switch label="Notify" description="Send emails" />);
    expect(screen.getByText('Send emails')).toBeInTheDocument();
  });

  it('calls onChange with toggled value', () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('is disabled', () => {
    render(<Switch disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('shows checked state', () => {
    render(<Switch checked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});

describe('FileInput', () => {
  it('renders with label', () => {
    render(<FileInput label="Upload" />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('renders file input', () => {
    const { container } = render(<FileInput />);
    expect(container.querySelector('input[type="file"]')).toBeInTheDocument();
  });

  it('calls onChange with file list', () => {
    const onChange = vi.fn();
    const { container } = render(<FileInput onChange={onChange} />);
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith([file]);
  });

  it('shows error', () => {
    render(<FileInput error="File too large" />);
    expect(screen.getByText('File too large')).toBeInTheDocument();
  });

  it('accepts accept and multiple props', () => {
    const { container } = render(<FileInput accept=".pdf" multiple />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', '.pdf');
    expect(input).toHaveAttribute('multiple');
  });

  it('shows helper text', () => {
    render(<FileInput helperText="Max 5MB" />);
    expect(screen.getByText('Max 5MB')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(<FileInput label="Upload" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});

describe('FormGroup', () => {
  it('renders children', () => {
    render(<FormGroup><Input label="Name" /></FormGroup>);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });
});

describe('FormRow', () => {
  it('renders children', () => {
    render(<FormRow><Input label="First" /><Input label="Last" /></FormRow>);
    expect(screen.getByLabelText('First')).toBeInTheDocument();
    expect(screen.getByLabelText('Last')).toBeInTheDocument();
  });
});

describe('FormActions', () => {
  it('renders children', () => {
    render(<FormActions><button>Submit</button></FormActions>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('applies alignment classes', () => {
    const { rerender } = render(<FormActions align="left"><button>X</button></FormActions>);
    expect(screen.getByText('X').parentElement).toHaveClass('justify-start');
    rerender(<FormActions align="center"><button>X</button></FormActions>);
    expect(screen.getByText('X').parentElement).toHaveClass('justify-center');
    rerender(<FormActions align="right"><button>X</button></FormActions>);
    expect(screen.getByText('X').parentElement).toHaveClass('justify-end');
  });
});

describe('FieldError', () => {
  it('renders error text', () => {
    render(<FieldError error="Something wrong" />);
    expect(screen.getByText('Something wrong')).toBeInTheDocument();
  });

  it('returns null when no error', () => {
    const { container } = render(<FieldError />);
    expect(container.firstChild).toBeNull();
  });
});

describe('FieldHelper', () => {
  it('renders helper text', () => {
    render(<FieldHelper text="Some help" />);
    expect(screen.getByText('Some help')).toBeInTheDocument();
  });

  it('returns null when no text', () => {
    const { container } = render(<FieldHelper />);
    expect(container.firstChild).toBeNull();
  });
});
