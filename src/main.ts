import { mount, unmount } from 'svelte';
import App from './App.svelte';
import BootLoading from './components/ui/BootLoading.svelte';
import './app.css';
import { locale, type SupportedLocale } from './lib/i18n';
import { get } from 'svelte/store';
import { registerServiceWorker } from './lib/pwa';
import { allStoresReady } from './lib/stores/allStoresReady';
import { relocalizeDemoCampaign } from './lib/stores/demoLocale';

const target = document.getElementById('app');
if (!target) throw new Error('Missing #app root element');

// Every campaign store hydrates asynchronously from IndexedDB (see
// `stores/persistedList.svelte.ts`); show a brief loading state rather than
// mounting `App` before that data exists. `allStoresReady` never rejects —
// a hydration failure degrades to seed/in-memory data instead — so this
// always proceeds to mount `App`.
const loading = mount(BootLoading, { target });

const appPromise = allStoresReady.then(() => {
  relocalizeDemoCampaign((get(locale) ?? 'en') as SupportedLocale);
  unmount(loading);
  const app = mount(App, { target });
  registerServiceWorker();
  return app;
});

export default appPromise;
