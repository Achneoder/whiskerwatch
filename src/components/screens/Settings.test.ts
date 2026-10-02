import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import Settings from './Settings.svelte';
import { setTheme } from '../../lib/stores/theme.svelte';
import { setLocale } from '../../lib/i18n';

const fileData = {
  version: 2,
  exportedAt: '2026-09-02T10:00:00.000Z',
  campaignName: 'Owl Bridge',
  party: [],
  hirelings: [],
  adventures: [],
  beats: [],
  sessions: [{ id: 's1', number: 1, date: '2026-09-01', title: 'One' }],
  bestiary: [],
  factions: [],
  factionEdges: [],
  hexNodes: [],
  campaignHistory: [],
};

const shareCampaign = vi.fn(async (): Promise<'shared' | 'downloaded' | 'cancelled'> => 'downloaded');
const readCampaignFile = vi.fn(async (_file: File) => fileData);
const applyCampaignImport = vi.fn(async (_data: unknown) => {});

vi.mock('../../lib/campaignExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/campaignExport')>();
  return {
    summarizeCampaignExport: actual.summarizeCampaignExport,
    latestSessionNumber: actual.latestSessionNumber,
    shareCampaign: () => shareCampaign(),
    readCampaignFile: (file: File) => readCampaignFile(file),
    applyCampaignImport: (data: unknown) => applyCampaignImport(data),
  };
});

describe('Settings', () => {
  beforeEach(() => {
    setTheme('light');
    setLocale('en');
    shareCampaign.mockClear();
    shareCampaign.mockImplementation(async () => 'downloaded');
    readCampaignFile.mockClear();
    readCampaignFile.mockImplementation(async () => fileData);
    applyCampaignImport.mockClear();
    applyCampaignImport.mockImplementation(async () => {});
  });

  afterEach(() => {
    setLocale('en');
    setTheme('light');
  });

  it('shows the "data lives only in this browser" notice', () => {
    render(Settings, { props: { onnavigate: vi.fn() } });
    expect(screen.getByText('Your campaign lives only in this browser.')).toBeInTheDocument();
  });

  it('switches the theme via the appearance segmented control', async () => {
    render(Settings, { props: { onnavigate: vi.fn() } });
    const dark = screen.getByRole('button', { name: 'Dark burrow', pressed: false });

    await fireEvent.click(dark);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark burrow' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches the language and re-renders labels in German', async () => {
    render(Settings, { props: { onnavigate: vi.fn() } });
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Einstellungen' })).toBeInTheDocument());
    expect(document.documentElement.lang).toBe('de');
  });

  it('exports the campaign in one tap and confirms', async () => {
    render(Settings, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Export campaign' }));

    expect(shareCampaign).toHaveBeenCalledOnce();
    expect(await screen.findByText('Saved to your downloads.')).toBeInTheDocument();
  });

  it('confirms when the campaign went out through the share sheet', async () => {
    shareCampaign.mockImplementation(async () => 'shared');
    render(Settings, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Export campaign' }));

    expect(await screen.findByText(/Campaign shared/)).toBeInTheDocument();
  });

  it('shows no confirmation when the share sheet was closed', async () => {
    shareCampaign.mockImplementation(async () => 'cancelled');
    render(Settings, { props: { onnavigate: vi.fn() } });

    await fireEvent.click(screen.getByRole('button', { name: 'Export campaign' }));

    await waitFor(() => expect(shareCampaign).toHaveBeenCalledOnce());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it("previews the file's contents in the confirm dialog", async () => {
    const { container } = render(Settings, { props: { onnavigate: vi.fn() } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    await fireEvent.change(fileInput, { target: { files: [new File(['{}'], 'campaign.json')] } });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Owl Bridge')).toBeInTheDocument();
    expect(within(dialog).getByText(/latest: #1/)).toBeInTheDocument();
  });

  it('requires confirmation before importing (destructive)', async () => {
    const { container } = render(Settings, { props: { onnavigate: vi.fn() } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'campaign.json', { type: 'application/json' });

    await fireEvent.change(fileInput, { target: { files: [file] } });

    // Nothing imported until the confirm dialog is accepted.
    const dialog = await screen.findByRole('dialog');
    expect(applyCampaignImport).not.toHaveBeenCalled();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Import and replace' }));

    await waitFor(() => expect(applyCampaignImport).toHaveBeenCalledWith(fileData));
    expect(await screen.findByText('Campaign restored.')).toBeInTheDocument();
  });

  it('cancelling the import dialog imports nothing', async () => {
    const { container } = render(Settings, { props: { onnavigate: vi.fn() } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'campaign.json', { type: 'application/json' });

    await fireEvent.change(fileInput, { target: { files: [file] } });
    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(applyCampaignImport).not.toHaveBeenCalled();
  });

  it('surfaces an error right away when the chosen file is invalid, without asking to replace anything', async () => {
    readCampaignFile.mockRejectedValueOnce(new Error('That file is not valid JSON.'));
    const { container } = render(Settings, { props: { onnavigate: vi.fn() } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['nope'], 'bad.json', { type: 'application/json' });

    await fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('That file is not valid JSON.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(applyCampaignImport).not.toHaveBeenCalled();
  });

  it('surfaces an error when saving the import fails', async () => {
    applyCampaignImport.mockRejectedValueOnce(new Error('Storage is full.'));
    const { container } = render(Settings, { props: { onnavigate: vi.fn() } });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    await fireEvent.change(fileInput, { target: { files: [new File(['{}'], 'campaign.json')] } });
    const dialog = await screen.findByRole('dialog');
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Import and replace' }));

    expect(await screen.findByText('Storage is full.')).toBeInTheDocument();
  });
});
