// Communications Page - Bulk Messaging System
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';
import Modal from '../components/Shared/Modal';
import { PageLoader } from '../components/Shared/Spinner';

export default function Communications() {
  const queryClient = useQueryClient();
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [activeTab, setActiveTab] = useState('history');

  const { data: messageHistory = [], isLoading } = useQuery({
    queryKey: ['message-history'],
    queryFn: async () => {
      const response = await api.get('/api/communications/history');
      return response.data;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
        <button
          onClick={() => setShowComposeModal(true)}
          className="btn btn-primary"
        >
          Compose Message
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <nav className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Message History
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'scheduled'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Scheduled
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'history' && (
        <MessageHistory messages={messageHistory} isLoading={isLoading} />
      )}
      {activeTab === 'templates' && <MessageTemplates />}
      {activeTab === 'scheduled' && <ScheduledMessages />}

      {/* Compose Modal */}
      <ComposeMessageModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
      />
    </div>
  );
}

function MessageHistory({ messages, isLoading }) {
  if (isLoading) return <PageLoader />;

  return (
    <div className="bg-white rounded-lg shadow">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No messages sent yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {messages.map((message) => (
            <MessageHistoryItem key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageHistoryItem({ message }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900">{message.subject}</h3>
            <MessageTypeBadge type={message.type} />
            <MessageStatusBadge status={message.status} />
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Sent to {message.recipient_count} recipients on{' '}
            {new Date(message.sent_at).toLocaleString()}
          </p>
          {expanded && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.content}</p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Delivered:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {message.delivered_count}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Opened:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {message.opened_count}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {message.failed_count}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-blue-600 hover:text-blue-900 text-sm"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </button>
      </div>
    </div>
  );
}

function ComposeMessageModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [formData, setFormData] = useState({
    type: 'email',
    recipients: 'all_active',
    subject: '',
    message: '',
    schedule_for: '',
  });

  const sendMessage = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/communications/send', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['message-history']);
      onClose();
      resetForm();
      success('Message sent successfully!');
    },
    onError: (err) => {
      console.error('Error sending message:', err);
      error('Failed to send message. Please try again.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.subject && (formData.type === 'email' || formData.type === 'both')) {
      error('Please enter a subject');
      return;
    }

    if (!formData.message.trim()) {
      error('Please enter a message');
      return;
    }

    if (formData.type === 'sms' && formData.message.length > 160) {
      error('SMS message must be 160 characters or less');
      return;
    }

    if (formData.schedule_for && new Date(formData.schedule_for) <= new Date()) {
      error('Schedule time must be in the future');
      return;
    }

    sendMessage.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      type: 'email',
      recipients: 'all_active',
      subject: '',
      message: '',
      schedule_for: '',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose Message" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Message Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="email"
                checked={formData.type === 'email'}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Email</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="sms"
                checked={formData.type === 'sms'}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">SMS</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="both"
                checked={formData.type === 'both'}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Both</span>
            </label>
          </div>
        </div>

        {/* Recipients */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipients
          </label>
          <select
            value={formData.recipients}
            onChange={(e) => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
            className="input"
          >
            <option value="all_active">All Active Members</option>
            <option value="all_trial">All Trial Members</option>
            <option value="all_paused">All Paused Members</option>
            <option value="location_burleigh">Burleigh Heads Location</option>
            <option value="location_varsity">Varsity Lakes Location</option>
            <option value="membership_unlimited">Unlimited Members</option>
            <option value="membership_2x">2x Per Week Members</option>
            <option value="membership_3x">3x Per Week Members</option>
          </select>
        </div>

        {/* Subject (Email only) */}
        {(formData.type === 'email' || formData.type === 'both') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="input"
              placeholder="Important Update"
              required
            />
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            rows="8"
            className="input"
            placeholder="Type your message here..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.type === 'sms' && `${formData.message.length}/160 characters`}
          </p>
        </div>

        {/* Schedule */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={!!formData.schedule_for}
              onChange={(e) => {
                if (!e.target.checked) {
                  setFormData(prev => ({ ...prev, schedule_for: '' }));
                }
              }}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Schedule for later</span>
          </label>
          {formData.schedule_for !== '' && (
            <input
              type="datetime-local"
              value={formData.schedule_for}
              onChange={(e) => setFormData(prev => ({ ...prev, schedule_for: e.target.value }))}
              className="input mt-2"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={sendMessage.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={sendMessage.isPending}
          >
            {sendMessage.isPending
              ? 'Sending...'
              : formData.schedule_for
              ? 'Schedule Message'
              : 'Send Now'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MessageTemplates() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const response = await api.get('/api/communications/templates');
      return response.data?.templates || [];
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Message Templates</h2>
          <button className="btn btn-primary">Create Template</button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found</p>
        </div>
      ) : (
      <div className="divide-y divide-gray-200">
        {templates.map((template) => (
          <div key={template.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <MessageTypeBadge type={template.type} />
                </div>
                <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{template.content}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="text-blue-600 hover:text-blue-900 text-sm">
                  Use Template
                </button>
                <button type="button" className="text-gray-600 hover:text-gray-900 text-sm">
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function ScheduledMessages() {
  const { data: scheduled = [], isLoading } = useQuery({
    queryKey: ['scheduled-messages'],
    queryFn: async () => {
      const response = await api.get('/api/communications/scheduled');
      return response.data?.scheduled || [];
    },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="bg-white rounded-lg shadow">
      {scheduled.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No scheduled messages</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {scheduled.map((message) => (
            <div key={message.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{message.subject}</h3>
                  <p className="text-sm text-gray-600">
                    Scheduled for {new Date(message.scheduled_for).toLocaleString()}
                  </p>
                </div>
                <button className="text-red-600 hover:text-red-900 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageTypeBadge({ type }) {
  const badges = {
    email: 'badge-blue',
    sms: 'badge-green',
    both: 'badge-purple',
  };

  const labels = {
    email: 'Email',
    sms: 'SMS',
    both: 'Email & SMS',
  };

  return (
    <span className={`badge ${badges[type] || 'badge-gray'} text-xs`}>
      {labels[type] || type}
    </span>
  );
}

function MessageStatusBadge({ status }) {
  const badges = {
    sent: 'badge-green',
    scheduled: 'badge-yellow',
    failed: 'badge-red',
    draft: 'badge-gray',
  };

  return (
    <span className={`badge ${badges[status]} text-xs capitalize`}>
      {status}
    </span>
  );
}
