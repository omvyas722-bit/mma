// Command Palette - Quick Navigation and Actions
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Default commands
  const defaultCommands = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: '📊', action: () => navigate('/'), category: 'Navigation' },
    { id: 'nav-members', label: 'Go to Members', icon: '👥', action: () => navigate('/members'), category: 'Navigation' },
    { id: 'nav-leads', label: 'Go to Leads', icon: '🎯', action: () => navigate('/leads'), category: 'Navigation' },
    { id: 'nav-classes', label: 'Go to Classes', icon: '📅', action: () => navigate('/classes'), category: 'Navigation' },
    { id: 'nav-payments', label: 'Go to Payments', icon: '💳', action: () => navigate('/payments'), category: 'Navigation' },
    { id: 'nav-reports', label: 'Go to Reports', icon: '📈', action: () => navigate('/reports'), category: 'Navigation' },
    { id: 'nav-settings', label: 'Go to Settings', icon: '⚙️', action: () => navigate('/settings'), category: 'Navigation' },
    { id: 'nav-communications', label: 'Go to Communications', icon: '✉️', action: () => navigate('/communications'), category: 'Navigation' },
    { id: 'nav-calendar', label: 'Go to Calendar', icon: '📆', action: () => navigate('/calendar'), category: 'Navigation' },

    // Quick Actions
    { id: 'action-add-member', label: 'Add New Member', icon: '➕', keywords: ['create', 'new'], category: 'Actions' },
    { id: 'action-add-lead', label: 'Add New Lead', icon: '➕', keywords: ['create', 'new'], category: 'Actions' },
    { id: 'action-add-class', label: 'Add New Class', icon: '➕', keywords: ['create', 'new'], category: 'Actions' },
    { id: 'action-process-payment', label: 'Process Payment', icon: '💰', keywords: ['pay', 'charge'], category: 'Actions' },
    { id: 'action-send-message', label: 'Send Message', icon: '📧', keywords: ['email', 'sms', 'communicate'], category: 'Actions' },
    { id: 'action-export-data', label: 'Export Data', icon: '📥', keywords: ['download', 'csv'], category: 'Actions' },
  ];

  const allCommands = [...defaultCommands, ...commands];

  // Filter commands based on search
  const filteredCommands = search
    ? allCommands.filter(cmd => {
        const searchLower = search.toLowerCase();
        const labelMatch = cmd.label.toLowerCase().includes(searchLower);
        const keywordsMatch = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower));
        const categoryMatch = cmd.category?.toLowerCase().includes(searchLower);
        return labelMatch || keywordsMatch || categoryMatch;
      })
    : allCommands;

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(cmd);
    return acc;
  }, {});

  const executeCommand = useCallback((command) => {
    if (command.action) {
      command.action();
    }
    onClose();
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose, executeCommand]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl z-50 animate-slide-down">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search..."
                className="w-full pl-10 pr-4 py-3 text-lg border-none focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No commands found
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    {category}
                  </div>
                  {cmds.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        onClick={() => executeCommand(command)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-l-2 border-blue-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-2xl">{command.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {command.label}
                          </div>
                          {command.description && (
                            <div className="text-sm text-gray-500">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.shortcut && (
                          <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-300 rounded">
                            {command.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↵</kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">esc</kbd>
                to close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook to manage command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

// Usage example:
/*
import CommandPalette, { useCommandPalette } from './components/Shared/CommandPalette';

function App() {
  const commandPalette = useCommandPalette();

  // Custom commands
  const customCommands = [
    {
      id: 'custom-action',
      label: 'Custom Action',
      icon: '⚡',
      action: () => console.log('Custom action'),
      category: 'Custom',
      keywords: ['special', 'custom'],
      description: 'Perform a custom action',
      shortcut: '⌘⇧P',
    },
  ];

  return (
    <div>
      <button onClick={commandPalette.open}>
        Open Command Palette (⌘K)
      </button>

      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        commands={customCommands}
      />

      <YourApp />
    </div>
  );
}
*/
