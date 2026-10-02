import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CampaignImportPreview from './CampaignImportPreview.svelte';
import type { CampaignExportSummary } from '../../lib/campaignExport';

const summary: CampaignExportSummary = {
  campaignName: 'Owl Bridge',
  exportedAt: '2026-09-02T10:00:00.000Z',
  sessions: 4,
  latestSessionNumber: 4,
  party: 3,
  adventures: 2,
  timelineEntries: 12,
};

describe('CampaignImportPreview', () => {
  it("lists what's in the file", () => {
    render(CampaignImportPreview, { props: { summary, localLatestSessionNumber: 4 } });

    expect(screen.getByText('Owl Bridge')).toBeInTheDocument();
    expect(screen.getByText(/latest: #4/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('warns when the file is behind the campaign already on this device', () => {
    render(CampaignImportPreview, { props: { summary, localLatestSessionNumber: 6 } });

    expect(screen.getByRole('alert')).toHaveTextContent('only goes up to session #4');
    expect(screen.getByRole('alert')).toHaveTextContent('session #6');
  });

  it("says the local timeline is kept when an older file doesn't carry one", () => {
    const { timelineEntries: _omit, ...withoutTimeline } = summary;
    render(CampaignImportPreview, { props: { summary: withoutTimeline, localLatestSessionNumber: 0 } });

    expect(screen.getByText(/this device's timeline is kept/)).toBeInTheDocument();
  });
});
