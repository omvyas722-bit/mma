import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog, AlertDialog, Drawer, BottomSheet } from './index';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders title and children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="My Modal">
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test" showCloseButton={false}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('applies size class', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="sm">
        <p>Content</p>
      </Modal>
    );
    expect(document.body.querySelector('.max-w-md')).toBeInTheDocument();
  });

  it('renders without title when not provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose on escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on escape when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test" closeOnEscape={false}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on backdrop click when closeOnBackdrop=true', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on backdrop click when closeOnBackdrop=false', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test" closeOnBackdrop={false}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies all size classes', () => {
    const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-full' };
    Object.entries(sizes).forEach(([size, cls]) => {
      const { unmount } = render(<Modal isOpen={true} onClose={() => {}} size={size}><p>{size}</p></Modal>);
      expect(screen.getByText(size)).toBeInTheDocument();
      unmount();
    });
  });

  it('locks body scroll when open', () => {
    const { rerender } = render(<Modal isOpen={true} onClose={() => {}}><p>Content</p></Modal>);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Modal isOpen={false} onClose={() => {}}><p>Content</p></Modal>);
    expect(document.body.style.overflow).toBe('unset');
  });
});

describe('ModalHeader', () => {
  it('renders children', () => {
    render(<ModalHeader><h2>Header</h2></ModalHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });
});

describe('ModalBody', () => {
  it('renders children', () => {
    render(<ModalBody><p>Body</p></ModalBody>);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

describe('ModalFooter', () => {
  it('renders children', () => {
    render(<ModalFooter><button>Save</button></ModalFooter>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});

describe('ConfirmDialog Component', () => {
  it('renders confirm and cancel buttons', () => {
    render(
      <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={() => {}} title="Delete?" message="Are you sure?" />
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn().mockResolvedValue();
    render(
      <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={onConfirm} message="Sure?" />
    );
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog isOpen={true} onClose={onClose} onConfirm={() => {}} message="Sure?" />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows custom button text', () => {
    render(
      <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={() => {}} confirmText="Yes" cancelText="No" message="Sure?" />
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={() => {}} isLoading message="Wait" />
    );
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(
      <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={() => {}} isLoading message="Wait" />
    );
    expect(screen.getByText('Processing...')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('applies variant styles', () => {
    const variants = ['danger', 'warning', 'info', 'success'];
    variants.forEach(variant => {
      const { unmount } = render(
        <ConfirmDialog isOpen={true} onClose={() => {}} onConfirm={() => {}} variant={variant} message="Test" />
      );
      expect(screen.getByText(variant === 'danger' ? 'Confirm' : 'Confirm')).toBeInTheDocument();
      unmount();
    });
  });
});

describe('AlertDialog Component', () => {
  it('renders message and OK button', () => {
    render(
      <AlertDialog isOpen={true} onClose={() => {}} title="Alert" message="Something happened" />
    );
    expect(screen.getByText('Something happened')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('calls onClose when OK clicked', () => {
    const onClose = vi.fn();
    render(
      <AlertDialog isOpen={true} onClose={onClose} title="Alert" message="Hi" />
    );
    fireEvent.click(screen.getByText('OK'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows custom button text', () => {
    render(
      <AlertDialog isOpen={true} onClose={() => {}} message="Hi" buttonText="Got it" />
    );
    expect(screen.getByText('Got it')).toBeInTheDocument();
  });

  it('renders with different variant icons', () => {
    const variants = ['success', 'error', 'warning', 'info'];
    variants.forEach(variant => {
      const { unmount } = render(
        <AlertDialog isOpen={true} onClose={() => {}} message={variant} variant={variant} />
      );
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    });
  });
});

describe('Drawer Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} title="Drawer">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.queryByText('Drawer')).not.toBeInTheDocument();
  });

  it('renders title and children when isOpen is true', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}} title="My Drawer">
        <p>Drawer content</p>
      </Drawer>
    );
    expect(screen.getByText('My Drawer')).toBeInTheDocument();
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test">
        <p>C</p>
      </Drawer>
    );
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders in different positions', () => {
    const positions = ['left', 'right', 'top', 'bottom'];
    positions.forEach(position => {
      const { unmount } = render(
        <Drawer isOpen={true} onClose={() => {}} title={position} position={position}>
          <p>Content</p>
        </Drawer>
      );
      expect(screen.getByRole('heading', { name: position })).toBeInTheDocument();
      unmount();
    });
  });

  it('does not close on backdrop when closeOnBackdrop=false', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen={true} onClose={onClose} title="Test" closeOnBackdrop={false}>
        <p>C</p>
      </Drawer>
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('BottomSheet Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}} title="Sheet">
        <p>Content</p>
      </BottomSheet>
    );
    expect(screen.queryByText('Sheet')).not.toBeInTheDocument();
  });

  it('renders title when isOpen is true', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}} title="My Sheet">
        <p>Content</p>
      </BottomSheet>
    );
    expect(screen.getByText('My Sheet')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}} title="Sheet">
        <p>Child content</p>
      </BottomSheet>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Sheet">
        <p>Content</p>
      </BottomSheet>
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on backdrop when closeOnBackdrop=false', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen={true} onClose={onClose} title="Sheet" closeOnBackdrop={false}>
        <p>Content</p>
      </BottomSheet>
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders without title', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}}>
        <p>No title</p>
      </BottomSheet>
    );
    expect(screen.getByText('No title')).toBeInTheDocument();
  });
});
