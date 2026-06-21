import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { NotificationProvider } from '../contexts/NotificationContext';
import SocialMedia from './SocialMedia';

const API_URL = 'http://localhost:3001';

afterEach(() => server.resetHandlers());

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  return ({ children }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function addSocialMediaHandlers() {
  server.use(
    http.get(`${API_URL}/api/social-media/platforms`, () =>
      HttpResponse.json({
        platforms: [
          { id: 1, name: 'facebook', display_name: 'Facebook', platform_type: 'facebook', connected: true, icon: '📘', page_id: '123' },
          { id: 2, name: 'instagram', display_name: 'Instagram', platform_type: 'instagram', connected: false, icon: '📷' },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/templates`, () =>
      HttpResponse.json({
        templates: [
          { id: 1, name: 'Welcome Post', content: 'Welcome to our gym!' },
          { id: 2, name: 'Promo Offer', content: 'Check out our special offer!' },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/posts`, () =>
      HttpResponse.json({
        posts: [
          { id: 1, title: 'Summer Promo', content: 'Join now for summer specials!', status: 'scheduled', post_type: 'image', platform_ids: '["facebook","instagram"]', scheduled_at: new Date(Date.now() + 86400000).toISOString(), created_by: 1 },
          { id: 2, title: null, content: 'Quick update', status: 'draft', post_type: 'story', platform_ids: '["facebook"]', scheduled_at: null, created_by: 1 },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/hashtag-groups`, () =>
      HttpResponse.json({
        groups: [
          { id: 1, name: 'MMA Tags', hashtags: ['#mma', '#bjj', '#fitness'] },
          { id: 2, name: 'Gym Life', hashtags: ['#gym', '#training'] },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/analytics`, () =>
      HttpResponse.json({
        total: { impressions: 15000, reach: 12000, engagement: 3500, likes: 2800, comments: 450, shares: 890, clicks: 2100 },
        byPlatform: [
          { platform: 'facebook', impressions: 8000, reach: 6000, engagement: 1500, likes: 1200, comments: 200, shares: 400, clicks: 900 },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/lead-correlation`, () =>
      HttpResponse.json({
        total_leads: 45,
        correlations: [
          { post_id: 1, title: 'Summer Promo', utm_campaign: 'summer_2024', leads_count: 12 },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/campaigns`, () =>
      HttpResponse.json({
        campaigns: [
          { id: 1, name: 'Summer Push', platform: 'facebook', campaign_type: 'promotion', status: 'active', budget: 500, spend: 200, revenue: 800, start_date: '2026-06-01', end_date: '2026-07-01', target_url: 'https://example.com', utm_campaign: 'summer_2024', notes: '' },
        ],
      })
    ),
    http.get(`${API_URL}/api/social-media/campaigns/1`, () =>
      HttpResponse.json({
        campaign: { id: 1, name: 'Summer Push', platform: 'facebook', campaign_type: 'promotion', status: 'active', budget: 500, spend: 200, revenue: 800 },
        analytics: { spend: 200, conversions: 10 },
        leads: [
          { id: 1, first_name: 'Alice', last_name: 'Johnson', stage: 'new', created_at: '2026-06-15T10:00:00Z' },
        ],
      })
    ),
    http.post(`${API_URL}/api/social-media/posts`, () =>
      HttpResponse.json({ id: 3, status: 'draft' }, { status: 201 })
    ),
    http.post(`${API_URL}/api/social-media/posts/:id/publish`, () =>
      HttpResponse.json({ success: true })
    ),
    http.delete(`${API_URL}/api/social-media/posts/:id`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/social-media/hashtag-groups`, () =>
      HttpResponse.json({ id: 3 }, { status: 201 })
    ),
    http.put(`${API_URL}/api/social-media/hashtag-groups/:id`, () =>
      HttpResponse.json({ success: true })
    ),
    http.delete(`${API_URL}/api/social-media/hashtag-groups/:id`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/social-media/campaigns`, () =>
      HttpResponse.json({ id: 2 }, { status: 201 })
    ),
    http.delete(`${API_URL}/api/social-media/campaigns/:id`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/social-media/platforms/:id/connect`, () =>
      HttpResponse.json({ success: true })
    ),
    http.post(`${API_URL}/api/social-media/platforms/:id/disconnect`, () =>
      HttpResponse.json({ success: true })
    ),
  );
}

describe('SocialMedia', () => {
  describe('Tab Navigation', () => {
    it('renders all tab buttons', () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      expect(screen.getAllByText(/Compose/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Calendar/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Campaigns/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Analytics/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Platforms/).length).toBeGreaterThanOrEqual(1);
    });

    it('displays platform indicators in header', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(screen.getByText('Platforms:')).toBeInTheDocument();
      });
    });

    it('switches to Calendar tab', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Calendar/i })[0]);
      expect(await screen.findByText('Content Calendar')).toBeInTheDocument();
    });

    it('switches to Analytics tab', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Analytics/i })[0]);
      expect(await screen.findByText('Analytics')).toBeInTheDocument();
    });

    it('switches to Campaigns tab', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      expect(await screen.findByText('Ad Campaigns & Lead Correlation')).toBeInTheDocument();
    });
  });

  describe('Compose Tab', () => {
    it('renders the compose form', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      expect(await screen.findByText('Compose Post')).toBeInTheDocument();
    });

    it('shows platform selection buttons', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      expect(await screen.findByText(/Facebook/)).toBeInTheDocument();
      expect(screen.getByText(/Instagram/)).toBeInTheDocument();
    });

    it('toggles platform selection on click', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const fbBtn = (await screen.findAllByText(/Facebook/))[0];
      await userEvent.click(fbBtn);
      expect(fbBtn.closest('button')).toHaveClass('bg-red-50');
      await userEvent.click(fbBtn);
      expect(fbBtn.closest('button')).toHaveClass('bg-gray-50');
    });

    it('shows template selector and applies template', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await screen.findByText('Welcome Post');
      const templateSelect = screen.getByLabelText('Content template');
      await userEvent.selectOptions(templateSelect, '1');
      const textarea = screen.getByPlaceholderText(/Write your post content/);
      expect(textarea).toHaveValue('Welcome to our gym!');
    });

    it('changes post type on click', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const reelBtn = await screen.findByText('📸 Reel');
      await userEvent.click(reelBtn);
      expect(reelBtn.closest('button')).toHaveClass('bg-red-50');
    });

    it('displays character count while typing', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const textarea = await screen.findByPlaceholderText(/Write your post content/);
      await userEvent.type(textarea, 'Hello world');
      expect(screen.getByText('11 characters')).toBeInTheDocument();
    });

    it('shows radio buttons for schedule mode', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      expect(await screen.findByText('Publish Now')).toBeInTheDocument();
      expect(screen.getByText('Save as Draft')).toBeInTheDocument();
      expect(screen.getAllByText('Schedule').length).toBeGreaterThanOrEqual(1);
    });

    it('shows datetime input when schedule is selected', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await screen.findByText('Compose Post');
      await userEvent.click(screen.getByRole('radio', { name: /Schedule/ }));
      expect(document.querySelector('input[type="datetime-local"]')).toBeInTheDocument();
    });

    it('submits post with content and platforms', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const textarea = await screen.findByPlaceholderText(/Write your post content/);
      await userEvent.type(textarea, 'Test post content');
      await userEvent.click(screen.getAllByText(/Facebook/)[0]);
      await userEvent.click(screen.getByText('Save Draft'));
      await waitFor(() => {
        expect(screen.getByText('Post created')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without content', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const saveBtn = await screen.findByText('Save Draft');
      await userEvent.click(saveBtn);
      expect(await screen.findByText('Content is required')).toBeInTheDocument();
    });

    it('resets form on reset button click', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const textarea = await screen.findByPlaceholderText(/Write your post content/);
      await userEvent.type(textarea, 'Some content');
      await userEvent.click(screen.getByText('Reset'));
      expect(textarea).toHaveValue('');
    });
  });

  describe('Hashtag Groups Panel', () => {
    it('displays saved hashtag groups', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      expect(await screen.findByText('MMA Tags')).toBeInTheDocument();
      expect(screen.getByText('Gym Life')).toBeInTheDocument();
    });

    it('inserts hashtags on group click', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      const mmaBtn = await screen.findByText('MMA Tags');
      await userEvent.click(mmaBtn);
      const textarea = screen.getByPlaceholderText(/Write your post content/);
      expect(textarea).toHaveValue('#mma #bjj #fitness');
    });

    it('opens manage groups modal', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(await screen.findByText('Manage Groups'));
      expect(screen.getByText('Manage Hashtag Groups')).toBeInTheDocument();
    });

    it('creates a new hashtag group', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(await screen.findByText('Manage Groups'));
      const nameInput = screen.getByPlaceholderText('Group name');
      const tagsInput = screen.getByPlaceholderText(/Hashtags \(space separated/);
      await userEvent.type(nameInput, 'New Group');
      await userEvent.type(tagsInput, '#new #tags');
      await userEvent.click(screen.getByText('Save Group'));
      await waitFor(() => {
        expect(screen.getByText('Created')).toBeInTheDocument();
      });
    });

    it('deletes a hashtag group', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(await screen.findByText('Manage Groups'));
      const deleteBtns = screen.getAllByText('Delete');
      await userEvent.click(deleteBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Deleted')).toBeInTheDocument();
      });
    });
  });

  describe('Calendar Tab', () => {
    it('shows content calendar with posts', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Calendar/i })[0]);
      expect(await screen.findByText('Content Calendar')).toBeInTheDocument();
      expect(screen.getByText('Summer Promo')).toBeInTheDocument();
    });

    it('shows empty state when no posts', async () => {
      addSocialMediaHandlers();
      server.use(
        http.get(`${API_URL}/api/social-media/posts`, () =>
          HttpResponse.json({ posts: [] })
        ),
      );
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Calendar/i })[0]);
      expect(await screen.findByText('No posts yet. Create your first post!')).toBeInTheDocument();
    });

    it('publishes a post from calendar', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Calendar/i })[0]);
      await screen.findByText('Summer Promo');
      const publishBtns = screen.getAllByTitle('Publish');
      await userEvent.click(publishBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Post published')).toBeInTheDocument();
      });
    });

    it('deletes a post from calendar', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Calendar/i })[0]);
      await screen.findByText('Summer Promo');
      const deleteBtns = screen.getAllByTitle('Delete');
      await userEvent.click(deleteBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Post deleted')).toBeInTheDocument();
      });
    });

    it('toggles inline composer', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Calendar/i })[0]);
      await userEvent.click(await screen.findByText('+ New Post'));
      expect(screen.getByText('Compose Post')).toBeInTheDocument();
      await userEvent.click(screen.getByText('Cancel'));
      await waitFor(() => {
        expect(screen.queryByText('Compose Post')).not.toBeInTheDocument();
      });
    });
  });

  describe('Analytics Tab', () => {
    it('shows analytics metrics', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Analytics/i })[0]);
      expect(await screen.findByText('15,000')).toBeInTheDocument();
      expect(screen.getByText('12,000')).toBeInTheDocument();
      expect(screen.getByText('3,500')).toBeInTheDocument();
      expect(screen.getByText('2,800')).toBeInTheDocument();
    });

    it('displays metric values', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Analytics/i })[0]);
      expect(await screen.findByText('15,000')).toBeInTheDocument();
    });

    it('shows by-platform table', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Analytics/i })[0]);
      expect(await screen.findByText('Platform')).toBeInTheDocument();
      expect(screen.getByText(/facebook/)).toBeInTheDocument();
    });

    it('shows lead correlation table', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Analytics/i })[0]);
      await waitFor(() => {
        expect(screen.getByText('Post → Lead Correlation')).toBeInTheDocument();
        expect(screen.getByText('Summer Promo')).toBeInTheDocument();
      });
    });

    it('shows empty state when no analytics', async () => {
      addSocialMediaHandlers();
      server.use(
        http.get(`${API_URL}/api/social-media/analytics`, () =>
          HttpResponse.json(null)
        ),
      );
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Analytics/i })[0]);
      expect(await screen.findByText('No analytics data available yet.')).toBeInTheDocument();
    });
  });

  describe('Campaigns Tab', () => {
    it('displays campaigns list', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      expect(await screen.findByText('Summer Push')).toBeInTheDocument();
      expect(screen.getByText(/facebook/)).toBeInTheDocument();
    });

    it('shows campaign detail on click', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      await userEvent.click(await screen.findByText('Summer Push'));
      expect(await screen.findByText('ROI Metrics')).toBeInTheDocument();
      expect(screen.getByText(/Leads Generated/)).toBeInTheDocument();
    });

    it('navigates back from campaign detail', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      await userEvent.click(await screen.findByText('Summer Push'));
      await userEvent.click(await screen.findByText('← Back'));
      expect(await screen.findByText('Ad Campaigns & Lead Correlation')).toBeInTheDocument();
    });

    it('deletes a campaign', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      await screen.findByText('Summer Push');
      const deleteBtns = screen.getAllByText('Delete');
      await userEvent.click(deleteBtns[0]);
      await waitFor(() => {
        expect(screen.getByText('Campaign deleted')).toBeInTheDocument();
      });
    });

    it('opens create campaign form and submits', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      await userEvent.click(await screen.findByText('+ New Campaign'));
      const nameInput = screen.getAllByDisplayValue('')[0];
      await userEvent.type(nameInput, 'New Campaign');
      await userEvent.click(screen.getByText('Create Campaign'));
      await waitFor(() => {
        expect(screen.getByText('Campaign created')).toBeInTheDocument();
      });
    });

    it('switches to lead correlation sub-tab', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      await userEvent.click(screen.getByText('Lead Correlation'));
      expect(await screen.findByText('Post → Lead Correlation')).toBeInTheDocument();
    });

    it('shows empty campaigns message', async () => {
      addSocialMediaHandlers();
      server.use(
        http.get(`${API_URL}/api/social-media/campaigns`, () =>
          HttpResponse.json({ campaigns: [] })
        ),
      );
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Campaigns/i })[0]);
      expect(await screen.findByText('No campaigns yet')).toBeInTheDocument();
    });
  });

  describe('Platforms Tab', () => {
    it('displays platform connections', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Platforms/i })[0]);
      expect(await screen.findByText('Platform Connections')).toBeInTheDocument();
      expect(screen.getByText(/Facebook/)).toBeInTheDocument();
      expect(screen.getByText(/Instagram/)).toBeInTheDocument();
    });

    it('disconnects a connected platform', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Platforms/i })[0]);
      await screen.findByText(/Facebook/);
      await userEvent.click(screen.getByText('Disconnect'));
      await waitFor(() => {
        expect(screen.getByText('Platform updated')).toBeInTheDocument();
      });
    });

    it('shows connect button for disconnected platform', async () => {
      addSocialMediaHandlers();
      render(<SocialMedia />, { wrapper: createWrapper() });
      await userEvent.click(screen.getAllByRole('tab', { name: /Platforms/i })[0]);
      expect(await screen.findByText('Not connected')).toBeInTheDocument();
      const connectBtns = screen.getAllByText('Connect');
      expect(connectBtns.length).toBeGreaterThanOrEqual(1);
    });
  });
});
