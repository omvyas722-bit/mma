import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImageUpload from './ImageUpload';

describe('ImageUpload', () => {
  it('renders with label', () => {
    render(<ImageUpload />);
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<ImageUpload label="Profile Photo" />);
    expect(screen.getByText('Profile Photo')).toBeInTheDocument();
  });

  it('shows preview when currentImage provided', () => {
    render(<ImageUpload currentImage="/test.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  it('does not show preview when showPreview is false', () => {
    render(<ImageUpload currentImage="/test.jpg" showPreview={false} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('opens file input on button click', () => {
    render(<ImageUpload />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('accepts specific formats', () => {
    render(<ImageUpload acceptedFormats={['image/jpeg']} />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute('accept', 'image/jpeg');
  });
});
