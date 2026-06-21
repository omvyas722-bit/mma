import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Input, Textarea, Select, Checkbox, RadioGroup, Switch,
  FileInput, FormGroup, FormRow, FormActions, FieldError, FieldHelper,
} from './index';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Name" id="name" />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<Input label="Name" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows error state', () => {
    render(<Input label="Name" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('renders disabled', () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });

  it('renders placeholder', () => {
    render(<Input label="Name" placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('renders required indicator', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders helper text', () => {
    render(<Input label="Name" helperText="Enter full name" />);
    expect(screen.getByText('Enter full name')).toBeInTheDocument();
  });

  it('sets aria-invalid when error', () => {
    render(<Input label="Name" error="Error" />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Textarea', () => {
  it('renders with label', () => {
    render(<Textarea label="Bio" id="bio" />);
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<Textarea label="Bio" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Bio'), { target: { value: 'text' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders disabled', () => {
    render(<Textarea label="Bio" disabled />);
    expect(screen.getByLabelText('Bio')).toBeDisabled();
  });

  it('shows error', () => {
    render(<Textarea label="Bio" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('sets rows default to 4', () => {
    render(<Textarea label="Bio" />);
    expect(screen.getByLabelText('Bio')).toHaveAttribute('rows', '4');
  });
});

describe('Select', () => {
  const options = [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }];

  it('renders with label', () => {
    render(<Select label="Choose" options={options} />);
    expect(screen.getByLabelText('Choose')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<Select label="Choose" options={options} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Choose'), { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders placeholder', () => {
    render(<Select label="Choose" options={options} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('renders disabled', () => {
    render(<Select label="Choose" options={options} disabled />);
    expect(screen.getByLabelText('Choose')).toBeDisabled();
  });

  it('shows error', () => {
    render(<Select label="Choose" options={options} error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept" />);
    expect(screen.getByLabelText('Accept')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<Checkbox label="Agree" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Agree'));
    expect(onChange).toHaveBeenCalled();
  });

  it('renders checked', () => {
    render(<Checkbox label="Checked" checked />);
    expect(screen.getByLabelText('Checked')).toBeChecked();
  });

  it('renders disabled', () => {
    render(<Checkbox label="Disabled" disabled />);
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });

  it('shows error', () => {
    render(<Checkbox label="Err" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

describe('RadioGroup', () => {
  const options = [{ value: '1', label: 'One' }, { value: '2', label: 'Two' }];

  it('renders options', () => {
    render(<RadioGroup label="Choose" options={options} />);
    expect(screen.getByLabelText('One')).toBeInTheDocument();
    expect(screen.getByLabelText('Two')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<RadioGroup label="Choose" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Two'));
    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('has radiogroup role', () => {
    render(<RadioGroup label="Pick" options={options} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('shows error', () => {
    render(<RadioGroup label="Pick" options={options} error="Choose one" />);
    expect(screen.getByText('Choose one')).toBeInTheDocument();
  });

  it('renders with value selected', () => {
    render(<RadioGroup label="Pick" options={options} value="1" />);
    expect(screen.getByLabelText('One')).toBeChecked();
  });
});

describe('Switch', () => {
  it('renders with label', () => {
    render(<Switch label="Enable" />);
    expect(screen.getByText('Enable')).toBeInTheDocument();
  });

  it('fires onChange', () => {
    const onChange = vi.fn();
    render(<Switch label="Toggle" onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders with description', () => {
    render(<Switch label="Feature" description="Turns on feature" />);
    expect(screen.getByText('Turns on feature')).toBeInTheDocument();
  });

  it('has aria-checked', () => {
    render(<Switch label="On" checked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('renders disabled', () => {
    render(<Switch label="Off" disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});

describe('FileInput', () => {
  it('renders with label', () => {
    render(<FileInput label="Upload" />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('renders file input', () => {
    render(<FileInput label="File" />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('fires onChange with files array', () => {
    const onChange = vi.fn();
    render(<FileInput label="File" onChange={onChange} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File([''], 'test.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith([file]);
  });

  it('shows error', () => {
    render(<FileInput label="File" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('renders with accept filter', () => {
    render(<FileInput label="File" accept="image/*" />);
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', 'image/*');
  });

  it('sets aria-invalid when error', () => {
    render(<FileInput label="File" error="Required" />);
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('FormGroup', () => {
  it('renders children', () => {
    render(<FormGroup><Input label="Nested" /></FormGroup>);
    expect(screen.getByLabelText('Nested')).toBeInTheDocument();
  });
});

describe('FormRow', () => {
  it('renders children in grid', () => {
    render(<FormRow><div data-testid="row-child">Content</div></FormRow>);
    expect(screen.getByTestId('row-child')).toBeInTheDocument();
  });
});

describe('FormActions', () => {
  it('renders children with right alignment by default', () => {
    render(<FormActions><button>Save</button></FormActions>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});

describe('FieldError', () => {
  it('renders error message', () => {
    render(<FieldError error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('returns null when no error', () => {
    const { container } = render(<FieldError error={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('FieldHelper', () => {
  it('renders helper text', () => {
    render(<FieldHelper text="Helper" />);
    expect(screen.getByText('Helper')).toBeInTheDocument();
  });

  it('returns null when no text', () => {
    const { container } = render(<FieldHelper text={null} />);
    expect(container.firstChild).toBeNull();
  });
});
