import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  AnimatedAccordionContent, SimpleAccordion, FAQAccordion, SettingsAccordion,
} from './index';

describe('Accordion', () => {
  it('renders children', () => {
    render(<Accordion><div>child</div></Accordion>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('shows content when trigger is clicked (single mode)', () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>Trigger A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Trigger A'));
    expect(screen.getByText('Content A')).toBeInTheDocument();
  });

  it('toggles content off on second click when allowToggle', () => {
    render(
      <Accordion allowToggle>
        <AccordionItem value="a">
          <AccordionTrigger>Trigger A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText('Trigger A'));
    expect(screen.getByText('Content A')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Trigger A'));
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('allows multiple items when allowMultiple', () => {
    render(
      <Accordion allowMultiple>
        <AccordionItem value="a">
          <AccordionTrigger>Trigger A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Trigger B</AccordionTrigger>
          <AccordionContent>Content B</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText('Trigger A'));
    fireEvent.click(screen.getByText('Trigger B'));
    expect(screen.getByText('Content A')).toBeInTheDocument();
    expect(screen.getByText('Content B')).toBeInTheDocument();
  });

  it('calls onChange when item toggled', () => {
    const onChange = vi.fn();
    render(
      <Accordion onChange={onChange}>
        <AccordionItem value="a">
          <AccordionTrigger>Trigger A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText('Trigger A'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('is controlled via value prop', () => {
    const { rerender } = render(
      <Accordion value="a">
        <AccordionItem value="a">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>A content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText('A content')).toBeInTheDocument();
    rerender(
      <Accordion value={null}>
        <AccordionItem value="a">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>A content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.queryByText('A content')).not.toBeInTheDocument();
  });

  it('disables trigger click when disabled', () => {
    render(
      <Accordion>
        <AccordionItem value="a" disabled>
          <AccordionTrigger>Trigger A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    fireEvent.click(screen.getByText('Trigger A'));
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('shows default value on mount', () => {
    render(
      <Accordion defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger>A</AccordionTrigger>
          <AccordionContent>A content</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>B</AccordionTrigger>
          <AccordionContent>B content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText('A content')).toBeInTheDocument();
    expect(screen.queryByText('B content')).not.toBeInTheDocument();
  });

  it('renders trigger with aria-expanded', () => {
    render(
      <Accordion defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger>Trigger A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText('Trigger A').closest('button')).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('AccordionTrigger', () => {
  it('renders icon when provided', () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger icon={<span data-testid="icon">*</span>}>Label</AccordionTrigger>
          <AccordionContent>C</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('has button type', () => {
    render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionTrigger>Btn</AccordionTrigger>
          <AccordionContent>C</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText('Btn').closest('button')).toHaveAttribute('type', 'button');
  });
});

describe('AccordionContent', () => {
  it('returns null when not active', () => {
    const { container } = render(
      <Accordion>
        <AccordionItem value="a">
          <AccordionContent>Hidden</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(container.querySelector('#accordion-content-a')).not.toBeInTheDocument();
  });
});

describe('SimpleAccordion', () => {
  it('renders items from array prop', () => {
    render(
      <SimpleAccordion
        items={[
          { value: '1', title: 'Section 1', content: <p>Content 1</p> },
          { value: '2', title: 'Section 2', content: <p>Content 2</p> },
        ]}
      />
    );
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Section 1'));
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });
});

describe('FAQAccordion', () => {
  it('renders FAQ items', () => {
    render(
      <FAQAccordion
        faqs={[
          { question: 'Q1?', answer: 'A1' },
          { question: 'Q2?', answer: 'A2' },
        ]}
      />
    );
    expect(screen.getByText('Q1?')).toBeInTheDocument();
    expect(screen.getByText('Q2?')).toBeInTheDocument();
  });
});

describe('SettingsAccordion', () => {
  it('renders sections with descriptions', () => {
    render(
      <SettingsAccordion
        sections={[
          { value: 'gen', title: 'General', description: 'Desc', icon: <span>i</span>, content: <p>Content</p> },
        ]}
      />
    );
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });
});
