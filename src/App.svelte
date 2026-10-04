<script lang="ts">
  import Dashboard from './components/screens/Dashboard.svelte';
  import Roster from './components/screens/Roster.svelte';
  import Adventure from './components/screens/Adventure.svelte';
  import Bestiary from './components/screens/Bestiary.svelte';
  import Factions from './components/screens/Factions.svelte';
  import HexMap from './components/screens/HexMap.svelte';
  import Generators from './components/screens/Generators.svelte';
  import Sessions from './components/screens/Sessions.svelte';
  import Timeline from './components/screens/Timeline.svelte';
  import Settings from './components/screens/Settings.svelte';
  import LiveSession from './components/screens/LiveSession.svelte';
  import type { NavScreen } from './components/layout/AppSidebar.svelte';
  import type { Session } from './lib/stores/sessions.svelte';
  import type { SearchResult } from './components/ui/QuickFind.svelte';

  let pendingRecapDraft = $state<Omit<Session, 'id'> | null>(null);

  function draftRecap(draft: Omit<Session, 'id'>) {
    pendingRecapDraft = draft;
    screen = 'sessions';
  }

  // Quick-find's "navigate and open the entity's existing edit surface" —
  // mirrors `pendingRecapDraft`/`draftRecap` above exactly: set once here,
  // handed down as a prop, and cleared via `onconsumedfocus` once the target
  // screen has used it. If the entity no longer exists by the time a screen
  // reads it, `focusId` simply matches nothing and no modal opens — a quiet
  // no-op, the same "dangling id degrades gracefully" rule the rest of the
  // app already follows.
  let pendingFocus = $state<{ screen: NavScreen; entityId: string } | null>(null);

  function selectSearchResult(result: SearchResult) {
    pendingFocus = { screen: result.navScreen, entityId: result.id };
    navigate(result.navScreen);
  }

  function consumeFocus() {
    pendingFocus = null;
  }

  let screen = $state<
    | 'dashboard'
    | 'roster'
    | 'adventure'
    | 'bestiary'
    | 'factions'
    | 'hexMap'
    | 'generators'
    | 'sessions'
    | 'timeline'
    | 'settings'
    | 'live'
  >('dashboard');

  function navigate(target: NavScreen) {
    if (target === 'overview') screen = 'dashboard';
    else if (target === 'warband') screen = 'roster';
    else if (target === 'adventure') screen = 'adventure';
    else if (target === 'bestiary') screen = 'bestiary';
    else if (target === 'factions') screen = 'factions';
    else if (target === 'hexMap') screen = 'hexMap';
    else if (target === 'generators') screen = 'generators';
    else if (target === 'sessions') screen = 'sessions';
    else if (target === 'timeline') screen = 'timeline';
    else if (target === 'settings') screen = 'settings';
  }
</script>

{#if screen === 'live'}
  <LiveSession onexit={() => (screen = 'dashboard')} ondraftrecap={draftRecap} onnavigate={navigate} />
{:else if screen === 'roster'}
  <Roster
    onnavigate={navigate}
    onstartsession={() => (screen = 'live')}
    onselectresult={selectSearchResult}
    focusId={pendingFocus?.screen === 'warband' ? pendingFocus.entityId : undefined}
    onconsumedfocus={consumeFocus}
  />
{:else if screen === 'adventure'}
  <Adventure
    onnavigate={navigate}
    onstartsession={() => (screen = 'live')}
    onselectresult={selectSearchResult}
    focusId={pendingFocus?.screen === 'adventure' ? pendingFocus.entityId : undefined}
    onconsumedfocus={consumeFocus}
  />
{:else if screen === 'bestiary'}
  <Bestiary
    onnavigate={navigate}
    onstartsession={() => (screen = 'live')}
    onselectresult={selectSearchResult}
    focusId={pendingFocus?.screen === 'bestiary' ? pendingFocus.entityId : undefined}
    onconsumedfocus={consumeFocus}
  />
{:else if screen === 'factions'}
  <Factions
    onnavigate={navigate}
    onstartsession={() => (screen = 'live')}
    onselectresult={selectSearchResult}
    focusId={pendingFocus?.screen === 'factions' ? pendingFocus.entityId : undefined}
    onconsumedfocus={consumeFocus}
  />
{:else if screen === 'hexMap'}
  <HexMap
    onnavigate={navigate}
    onstartsession={() => (screen = 'live')}
    onselectresult={selectSearchResult}
    focusId={pendingFocus?.screen === 'hexMap' ? pendingFocus.entityId : undefined}
    onconsumedfocus={consumeFocus}
  />
{:else if screen === 'generators'}
  <Generators onnavigate={navigate} onstartsession={() => (screen = 'live')} onselectresult={selectSearchResult} />
{:else if screen === 'sessions'}
  <Sessions
    onnavigate={navigate}
    onstartsession={() => (screen = 'live')}
    draftRecap={pendingRecapDraft}
    onconsumeddraft={() => (pendingRecapDraft = null)}
    onselectresult={selectSearchResult}
    focusId={pendingFocus?.screen === 'sessions' ? pendingFocus.entityId : undefined}
    onconsumedfocus={consumeFocus}
  />
{:else if screen === 'timeline'}
  <Timeline onnavigate={navigate} onstartsession={() => (screen = 'live')} onselectresult={selectSearchResult} />
{:else if screen === 'settings'}
  <Settings onnavigate={navigate} onstartsession={() => (screen = 'live')} onselectresult={selectSearchResult} />
{:else}
  <Dashboard onnavigate={navigate} onstartsession={() => (screen = 'live')} onselectresult={selectSearchResult} />
{/if}
