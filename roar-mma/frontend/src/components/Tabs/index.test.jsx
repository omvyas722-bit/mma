import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Tabs, TabList, Tab, TabPanels, TabPanel, SimpleTabs, VerticalTabs } from './index';

describe('SimpleTabs', () => {
  it('renders tab labels', () => {
    const tabs = [
      { value: 'tab1', label: 'Tab 1', content: 'Content 1' },
      { value: 'tab2', label: 'Tab 2', content: 'Content 2' },
    ];
    render(<SimpleTabs tabs={tabs} defaultValue="tab1" />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  it('shows first tab content by default', () => {
    const tabs = [
      { value: 'tab1', label: 'Tab 1', content: 'Content 1' },
      { value: 'tab2', label: 'Tab 2', content: 'Content 2' },
    ];
    render(<SimpleTabs tabs={tabs} defaultValue="tab1" />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });
});

describe('VerticalTabs', () => {
  it('renders tabs vertically', () => {
    const tabs = [
      { value: 'a', label: 'CA', content: 'California' },
      { value: 'ny', label: 'NY', content: 'New York' },
    ];
    render(<VerticalTabs tabs={tabs} defaultValue="a" />);
    expect(screen.getByText('CA')).toBeInTheDocument();
    expect(screen.getByText('NY')).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('renders tab panels', () => {
    render(
      <Tabs defaultValue="a">
        <TabList><Tab value="a">Alpha</Tab></TabList>
        <TabPanels><TabPanel value="a">Alpha panel</TabPanel></TabPanels>
      </Tabs>
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Alpha panel')).toBeInTheDocument();
  });
});
