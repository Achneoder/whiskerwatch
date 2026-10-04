<script lang="ts">
  import { tick } from 'svelte';
  import { _ } from 'svelte-i18n';
  import LiveSessionHeader from './LiveSessionHeader.svelte';
  import FactionClockStrip from './FactionClockStrip.svelte';
  import LiveSessionCard from './LiveSessionCard.svelte';
  import LiveSessionInventoryModal from './LiveSessionInventoryModal.svelte';
  import LiveSessionEncounterCard from './LiveSessionEncounterCard.svelte';
  import type { EncounterInstance } from './LiveSessionEncounterInstance.svelte';
  import LiveSessionWatchCard, { type WatchNeighborOption } from './LiveSessionWatchCard.svelte';
  import { MOUSE_LAYOUT, HIRELING_LAYOUT, capacity } from '../../lib/items';
  import SaveDock from './SaveDock.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import Tag from '../ui/Tag.svelte';
  import Button from '../ui/Button.svelte';
  import Modal from '../ui/Modal.svelte';
  import Input from '../ui/Input.svelte';
  import type { NavScreen } from '../layout/AppSidebar.svelte';
  import {
    getParty,
    dealDamage,
    healHp,
    killMember,
    addCondition,
    removeCondition,
    updateMember,
    addMemberItem,
    tickMemberItemCharge,
    type PartyMember,
  } from '../../lib/stores/party.svelte';
  import {
    getHirelings,
    dealHirelingDamage,
    healHirelingHp,
    killHireling,
    addHirelingCondition,
    removeHirelingCondition,
    updateHireling,
    addHirelingItem,
    tickHirelingItemCharge,
    type Hireling,
  } from '../../lib/stores/hirelings.svelte';
  import { getFactions, bumpFactionClock, updateFaction } from '../../lib/stores/factions.svelte';
  import { getBeats, type Beat } from '../../lib/stores/beats.svelte';
  import { getAdventures, updateAdventure, advanceAdventureWatch, watchStateOf } from '../../lib/stores/adventures.svelte';
  import { getHexNodes } from '../../lib/stores/hexmap.svelte';
  import { getBestiary, type BestiaryEntry } from '../../lib/stores/bestiary.svelte';
  import type { Item } from '../../lib/items';
  import { getLastSession, getNextSessionNumber, type Session } from '../../lib/stores/sessions.svelte';
  import { rollSave, rollMoraleSave } from '../../lib/generators/save';
  import { rollDice } from '../../lib/generators/roll';
  import { generateEncounterFor } from '../../lib/generators/encounters';
  import { rollReaction, type ReactionRollResult } from '../../lib/generators/reaction';
  import { CONDITIONS, type ConditionName } from '../../lib/conditions';
  import { neighbors as hexNeighbors, hexLabel } from '../../lib/hex';
  import { travelCost } from '../../lib/watchTime';
  import { getLiveSessionEvents, logEvent, clearLog } from '../../lib/stores/liveSessionLog.svelte';
  import { logDeath } from '../../lib/stores/campaignHistory.svelte';
  import { today } from '../../lib/date';
  import SessionRecapReview from './SessionRecapReview.svelte';
  import RulesDrawer from '../ui/RulesDrawer.svelte';

  interface Props {
    onexit?: () => void;
    /** Bubbles the drafted recap up so the app shell can open Sessions with SessionForm pre-filled. */
    ondraftrecap?: (draft: Omit<Session, 'id'>) => void;
    /** Threaded through for the Watch card's onboarding "Open Hex Map" fallback, when the active beat has no linked hex to suggest as a starting position. */
    onnavigate?: (screen: NavScreen) => void;
  }

  let { onexit, ondraftrecap, onnavigate }: Props = $props();

  let rulesOpen = $state(false);

  $effect(() => {
    document.documentElement.setAttribute('data-density', 'live');
    return () => document.documentElement.removeAttribute('data-density');
  });

  // Live Session's event log is session-scoped, not persisted — starting a
  // fresh sitting should never carry over facts from a previous one.
  //
  // Three event kinds from the spec (`beatStatusChanged`, `advancement`,
  // `scarGained`) are defined in `liveSessionLog.svelte.ts` but never
  // logged here: none of beat status, XP/level-up, or scars has a
  // mutation point reachable from Live Session today (beat status only
  // changes from the Adventure screen's `BeatTree`; `spendForCommunity` in
  // `party.svelte.ts` and `addScar`/`addHirelingScar` in
  // `party.svelte.ts`/`hirelings.svelte.ts` all have no UI at all yet).
  // Per the brief, that's a reason to skip wiring, not to invent new Live
  // Session surfaces for any of them — all three are natural follow-ups
  // once those actions exist somewhere reachable.
  clearLog();
  const sessionEvents = getLiveSessionEvents();
  let endSessionOpen = $state(false);

  function draftRecap(draft: Omit<Session, 'id'>) {
    clearLog();
    endSessionOpen = false;
    ondraftrecap?.(draft);
  }

  const party = getParty();
  const hirelings = getHirelings();
  const factions = getFactions();

  const lastSession = $derived(getLastSession());

  // Which adventure the GM has explicitly picked this sitting, if any. Null
  // until the GM taps a choice; the *effective* selection (see below) falls
  // back to the first option so there's always a valid `activeBeat`. Nothing
  // here persists — a fresh mount of Live Session always re-derives the
  // default. See docs/design/phase-12-live-session-adventure-picker.md.
  let selectedAdventureId = $state<string | null>(null);

  // Every beat currently marked 'active', across every adventure.
  const activeBeatsAll = $derived(getBeats().filter((b) => b.status === 'active'));

  const adventures = getAdventures();

  interface AdventureOption {
    id: string; // adventure id, or the beat id itself for the orphan-fallback case
    title: string;
    beat: Beat;
  }

  // One entry per adventure that has an active beat. If a beat's adventureId
  // doesn't resolve to a real Adventure record (shouldn't happen once boot's
  // migration has run, but storage can't be trusted blindly), fall back to
  // the beat's own title as the label so it never just vanishes from the
  // list.
  const activeAdventureOptions = $derived.by((): AdventureOption[] => {
    const seen = new Set<string>();
    const options: AdventureOption[] = [];
    for (const beat of activeBeatsAll) {
      const adventure = adventures.find((a) => a.id === beat.adventureId);
      const key = adventure?.id ?? beat.id;
      if (seen.has(key)) continue; // one option per adventure — first active beat wins, matching today's array-order fallback
      seen.add(key);
      options.push({ id: key, title: adventure?.title ?? beat.title, beat });
    }
    return options;
  });

  const needsPicker = $derived(activeAdventureOptions.length >= 2);

  const effectiveAdventureId = $derived(
    needsPicker ? (selectedAdventureId ?? activeAdventureOptions[0]!.id) : null,
  );

  // This replaces the old bare `getBeats().find(b => b.status === 'active')`
  // — with two-or-more concurrent adventures each carrying an active beat,
  // that lookup silently returned whichever beat happened to be first in
  // storage order, not whichever one the GM is actually running tonight.
  const activeBeat = $derived(
    needsPicker
      ? (activeAdventureOptions.find((o) => o.id === effectiveAdventureId)?.beat ?? null)
      : (activeBeatsAll[0] ?? null),
  );

  const hexNodes = getHexNodes();
  const bestiary = getBestiary();

  // Phase 15: the adventure actually backing the active beat — the one
  // whose hex-crawl clock (day/watch/currentHexId) the Watch card reads and
  // advances. `activeBeat.adventureId` already resolves to the right
  // adventure in both the picker and no-picker cases (see `activeBeat`
  // above), so no extra picker logic is needed here.
  const currentAdventure = $derived(activeBeat ? (adventures.find((a) => a.id === activeBeat.adventureId) ?? null) : null);
  const watchState = $derived(currentAdventure ? watchStateOf(currentAdventure) : null);

  // The hex-encounter surface is now keyed off the party's actual position
  // (`currentAdventure.currentHexId`), not the active beat's linked hex —
  // the party may have wandered off-beat once position tracking exists (see
  // docs/design/phase-15-watch-tracker-and-position.md). The beat's linked
  // hex still matters as `suggestedStartHex` below, for onboarding only.
  const currentHexId = $derived(currentAdventure?.currentHexId ?? null);
  const activeHex = $derived(currentHexId ? (hexNodes.find((h) => h.id === currentHexId) ?? null) : null);
  const suggestedStartHex = $derived(
    activeBeat?.hexNodeId ? (hexNodes.find((h) => h.id === activeBeat.hexNodeId) ?? null) : null,
  );

  const neighborOptions = $derived.by((): WatchNeighborOption[] => {
    if (!activeHex) return [];
    return hexNeighbors(activeHex.q, activeHex.r).map(({ q, r }) => {
      const label = hexLabel(q, r);
      const node = hexNodes.find((h) => h.q === q && h.r === r);
      if (!node) return { q, r, label, terrain: null, cost: null };
      if (node.terrain === 'water') return { q, r, label, terrain: node.terrain, cost: null, id: node.id };
      return { q, r, label, terrain: node.terrain, cost: travelCost(node.terrain), id: node.id };
    });
  });

  // All transient, screen-scoped Watch card state — never persisted, reset
  // whenever the GM switches to a different adventure (see the effect below).
  let lastCheckResult = $state<{ roll: number; hit: boolean } | null>(null);
  let exhaustedPending = $state(false);
  let forageResult = $state<{ rations: number } | null>(null);
  let showTwoWatchNote = $state(false);
  // Not reactive — only read/written from event handlers, never rendered
  // directly, so a plain closure variable is enough (matches `noticeTimer` below).
  let twoWatchNoteShownEver = false;

  $effect(() => {
    void currentAdventure?.id;
    lastCheckResult = null;
    exhaustedPending = false;
    forageResult = null;
    showTwoWatchNote = false;
  });

  let encounterResult = $state<BestiaryEntry | null>(null);
  // Tied to a specific encounter instance — rolling a new encounter always
  // clears whatever reaction was rolled for the previous one.
  let reactionResult = $state<ReactionRollResult | null>(null);

  // Live-combat HP tracker (Phase 13) — transient, screen-scoped, never
  // persisted, exactly as ephemeral as `encounterResult`/`reactionResult`
  // above. See docs/design/phase-13-encounter-tracker-and-item-handoff.md.
  let encounterInstances = $state<EncounterInstance[]>([]);
  // Whether this card has ever held at least one instance — used only to
  // decide whether an empty instance list means "never rolled" (show
  // nothing) or "fight's over" (show the loot hand-off tip). Reset whenever
  // the active hex changes, same as the instances themselves.
  let hadEncounterInstances = $state(false);

  function spawnInstance(entry: BestiaryEntry): EncounterInstance {
    const n = encounterInstances.length + 1;
    return { id: crypto.randomUUID(), label: `${entry.name} ${n}`, hp: entry.hp, maxHp: entry.hp };
  }

  function rollHexEncounter() {
    if (!activeHex) return;
    encounterResult = generateEncounterFor(activeHex.id, hexNodes, bestiary);
    reactionResult = null;
    // Clear before spawning so `spawnInstance`'s numbering starts back at 1
    // for the new fight, rather than continuing on from the previous one.
    encounterInstances = [];
    encounterInstances = encounterResult ? [spawnInstance(encounterResult)] : [];
    if (encounterInstances.length > 0) hadEncounterInstances = true;
    // Re-rolling closes any open instance drawer from the previous
    // encounter — those instance ids no longer exist.
    openDrawer = null;
  }

  function rollHexEncounterReaction() {
    reactionResult = rollReaction();
  }

  /**
   * Folds one `advanceAdventureWatch` result into the Watch card's transient
   * display state, and — on a hit — rolls the hex encounter exactly as the
   * manual "Roll an encounter" button does, keyed off whatever `activeHex`
   * resolves to *right now* (i.e. after any move this same tap made).
   */
  function applyWatchResult(result: NonNullable<ReturnType<typeof advanceAdventureWatch>>) {
    lastCheckResult = result.checkRolled ? { roll: result.checkRoll!, hit: result.checkHit } : null;
    exhaustedPending = result.exhaustedPending;
    if (result.checkHit) rollHexEncounter();
  }

  function handleStay() {
    if (!currentAdventure) return;
    forageResult = null;
    showTwoWatchNote = false;
    const result = advanceAdventureWatch(currentAdventure.id, { stay: true });
    if (result) applyWatchResult(result);
  }

  function handleForage() {
    if (!currentAdventure) return;
    showTwoWatchNote = false;
    const result = advanceAdventureWatch(currentAdventure.id, {});
    if (!result) return;
    applyWatchResult(result);
    forageResult = { rations: rollDice(1, 3).total };
  }

  /**
   * A hex-changing tap needs the existing "active hex changed" effect (see
   * below) to clear any stale encounter state for the *old* hex before a
   * check-hit here rolls a fresh one for the *new* hex — otherwise that
   * effect would fire after this handler returns and immediately wipe the
   * freshly-rolled encounter it just set. `tick()` waits for that effect to
   * run first, so `applyWatchResult`'s roll (if any) always lands last.
   */
  async function handleMove(hexId: string) {
    if (!currentAdventure) return;
    forageResult = null;
    const targetHex = hexNodes.find((h) => h.id === hexId);
    const cost = targetHex ? travelCost(targetHex.terrain) : 1;
    // An unresolvable hex id (deleted between render and tap) degrades to a
    // plain one-watch advance with no move — `advanceAdventureWatch` has no
    // way to resolve a hex id to terrain itself (see its doc comment).
    const result = advanceAdventureWatch(
      currentAdventure.id,
      targetHex ? { move: { hexId, terrain: targetHex.terrain } } : {},
    );
    if (!result) return;
    showTwoWatchNote = cost === 2 && !twoWatchNoteShownEver;
    if (showTwoWatchNote) twoWatchNoteShownEver = true;
    await tick();
    applyWatchResult(result);
  }

  function handleSetStart(hexId: string) {
    if (!currentAdventure) return;
    updateAdventure(currentAdventure.id, { currentHexId: hexId });
  }

  function handleForageRecipient(recipientId: string) {
    if (!forageResult) return;
    const found = sourceAndMemberFor(recipientId);
    if (!found) return;
    const { source, member } = found;
    const rationInput = { name: 'Rations', slots: 1 as const, charges: null, maxCharges: null, notes: '' };
    for (let i = 0; i < forageResult.rations; i += 1) {
      if (source === 'party') addMemberItem(recipientId, rationInput);
      else addHirelingItem(recipientId, rationInput);
    }
    announce(
      'forage:' + recipientId,
      $_('liveSession.watch.rationsAdded', { values: { count: forageResult.rations, name: member.name } }),
    );
    forageResult = null;
  }

  function handleApplyExhausted() {
    for (const m of activeParty) {
      addCondition(m.id, 'exhausted');
      logEvent({ kind: 'conditionGained', name: m.name, role: 'party', condition: CONDITIONS.exhausted.label });
    }
    for (const h of activeHirelings) {
      addHirelingCondition(h.id, 'exhausted');
      logEvent({ kind: 'conditionGained', name: h.name, role: 'hireling', condition: CONDITIONS.exhausted.label });
    }
    exhaustedPending = false;
  }

  function addAnotherInstance() {
    if (!encounterResult) return;
    encounterInstances = [...encounterInstances, spawnInstance(encounterResult)];
    hadEncounterInstances = true;
  }

  function damageInstance(id: string, amount: number) {
    const before = encounterInstances;
    encounterInstances = encounterInstances.map((i) => (i.id === id ? { ...i, hp: Math.max(0, i.hp - amount) } : i));
    announce('encounter:' + id, $_('liveSession.damageApplied', { values: { amount } }), () => (encounterInstances = before));
  }

  function healInstance(id: string, amount: number) {
    const before = encounterInstances;
    encounterInstances = encounterInstances.map((i) =>
      i.id === id ? { ...i, hp: Math.min(i.maxHp, i.hp + amount) } : i,
    );
    announce('encounter:' + id, $_('liveSession.healApplied', { values: { amount } }), () => (encounterInstances = before));
  }

  function removeInstance(id: string) {
    const before = encounterInstances;
    const removed = before.find((i) => i.id === id);
    encounterInstances = before.filter((i) => i.id !== id);
    if (removed) {
      announce(
        'encounter:' + id,
        $_('liveSession.encounter.removed', { values: { label: removed.label } }),
        () => (encounterInstances = before),
      );
    }
  }

  // A different active hex (new beat, or the same beat re-linked to a
  // different hex) means any previously-rolled encounter/reaction/instances
  // no longer apply to what's on screen.
  $effect(() => {
    void activeHex?.id;
    encounterResult = null;
    reactionResult = null;
    encounterInstances = [];
    hadEncounterInstances = false;
  });

  const activeParty = $derived(party.filter((m) => m.status === 'active'));
  const fallenParty = $derived(party.filter((m) => m.status === 'deceased'));
  const activeHirelings = $derived(hirelings.filter((h) => h.status === 'active'));
  const fallenHirelings = $derived(hirelings.filter((h) => h.status === 'deceased'));

  // The Watch card's forage recipient row — every active mouse/hireling, no
  // "sender" to exclude (unlike the item hand-off `recipients` below, which
  // excludes whoever's bag is open).
  const forageRecipients = $derived([
    ...activeParty.map((m) => ({ id: m.id, name: m.name, kind: 'party' as const })),
    ...activeHirelings.map((h) => ({ id: h.id, name: h.name, kind: 'hireling' as const })),
  ]);

  const topFactions = $derived(
    [...factions]
      .filter((f) => f.of > 0)
      .sort((a, b) => b.clock / b.of - a.clock / a.of)
      .slice(0, 2)
      .map((f) => ({ id: f.id, name: f.name, clock: f.clock, of: f.of })),
  );

  const saveableMembers = $derived([
    ...activeParty.map((m) => ({ id: m.id, name: m.name, str: m.str, dex: m.dex, wil: m.wil })),
    ...activeHirelings.map((h) => ({ id: h.id, name: h.name, str: h.str, dex: h.dex, wil: h.wil, loyal: h.loyal })),
  ]);

  type Source = 'party' | 'hireling';

  // At most one card's drawer is open across the whole screen at a time —
  // opening a new one closes whatever was already open.
  let openDrawer = $state<{ id: string; kind: 'damage' | 'condition' } | null>(null);
  let pendingStrSave = $state<{ id: string; source: Source; str: number } | null>(null);
  let deathConfirm = $state<{ id: string; source: Source; name: string } | null>(null);
  // Reset whenever a new death confirmation opens (see `requestDeath`/
  // `handleDamage`'s `outcome.died` branch) so a previous mouse's typed
  // cause never leaks into the next one's confirmation.
  let deathCause = $state('');
  // Independent of `openDrawer` — the inventory modal overlays the card
  // rather than expanding it, so there's no coordination needed between
  // "which drawer is open" and "whose bag is open". IDs are `crypto.
  // randomUUID()`-generated for both party members and hirelings, so a bare
  // id is enough to find the right one across both lists (see
  // `memberOfEitherSource` below).
  let openInventoryId = $state<string | null>(null);
  // The id of the item currently being handed off from the open inventory's
  // owner, or `null` when the modal is showing the plain item grid. Reset
  // whenever the inventory modal itself closes (see the `onclose` wiring
  // below) so reopening a different mouse's bag never starts mid-move.
  let movePickerFor = $state<string | null>(null);

  // Pay Day's paid/unpaid state is deliberately local and NOT persisted —
  // it resets every time the modal reopens. Non-payment has no automatic
  // mechanical penalty; this is purely a GM bookkeeping aid for the current
  // sitting, not a ledger.
  let payDayOpen = $state(false);
  let paidThisSession = $state<Set<string>>(new Set());
  let payDayMoraleResults = $state<Record<string, { roll: number; score: number; passed: boolean }>>({});

  function openPayDay() {
    paidThisSession = new Set();
    payDayMoraleResults = {};
    payDayOpen = true;
  }

  function togglePaid(id: string) {
    const next = new Set(paidThisSession);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    paidThisSession = next;
  }

  function rollPayDayMoraleSave(hireling: Hireling) {
    const outcome = rollMoraleSave(hireling.wil, hireling.loyal);
    payDayMoraleResults = {
      ...payDayMoraleResults,
      [hireling.id]: { roll: outcome.roll, score: outcome.score, passed: outcome.passed },
    };
    if (!outcome.passed) {
      logEvent({ kind: 'moraleFailed', name: hireling.name });
    }
  }

  interface Notice {
    id: string;
    text: string;
    undo?: (() => void) | undefined;
  }
  // A single "last action" notice for the whole screen — a GM acts on one
  // mouse/faction at a time at the table, so this is simpler than a per-card
  // timer and still matches the spec's "inline undo for ~6 seconds" ask.
  let notice = $state<Notice | null>(null);
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  function announce(id: string, text: string, undo?: () => void) {
    clearTimeout(noticeTimer);
    notice = { id, text, undo };
    noticeTimer = setTimeout(() => {
      notice = null;
    }, 6000);
  }

  function dismissNotice() {
    clearTimeout(noticeTimer);
    notice = null;
  }

  function drawerFor(id: string): 'damage' | 'condition' | null {
    return openDrawer?.id === id ? openDrawer.kind : null;
  }

  function toggleDrawer(id: string, kind: 'damage' | 'condition') {
    openDrawer = openDrawer?.id === id && openDrawer.kind === kind ? null : { id, kind };
  }

  function memberOf(source: Source, id: string): PartyMember | Hireling | undefined {
    return source === 'party' ? party.find((m) => m.id === id) : hirelings.find((h) => h.id === id);
  }

  /**
   * The inventory modal (`openInventoryId`) is keyed on a bare id shared
   * across both the party and hireling stores, so this figures out which
   * source/list it belongs to on demand rather than the modal state
   * carrying that around itself.
   */
  function sourceAndMemberFor(id: string): { source: Source; member: PartyMember | Hireling } | null {
    const member = party.find((m) => m.id === id);
    if (member) return { source: 'party', member };
    const hireling = hirelings.find((h) => h.id === id);
    if (hireling) return { source: 'hireling', member: hireling };
    return null;
  }

  interface Recipient {
    id: string;
    name: string;
    kind: 'party' | 'hireling';
    items: Item[];
  }

  // Every other active party member and hireling — never the sender, never
  // a fallen/deceased entry — matching `activeParty`/`activeHirelings`'
  // existing filters used everywhere else on this screen. Presentational
  // (`LiveSessionInventoryModal`) doesn't reach back into the stores itself.
  const recipients = $derived.by((): Recipient[] => {
    if (!openInventoryId) return [];
    return [
      ...activeParty
        .filter((m) => m.id !== openInventoryId)
        .map((m): Recipient => ({ id: m.id, name: m.name, kind: 'party', items: m.items })),
      ...activeHirelings
        .filter((h) => h.id !== openInventoryId)
        .map((h): Recipient => ({ id: h.id, name: h.name, kind: 'hireling', items: h.items })),
    ];
  });

  /**
   * Moves one item from whichever mouse/hireling currently has the
   * inventory modal open to `toId`. Always a genuine move (spliced out of
   * one array, pushed into the other), never a copy — undoable the same
   * "snapshot both sides, restore both sides" way `handleDamage`/
   * `handleHeal` already are across the party/hireling boundary. Per
   * `lib/items.ts`'s `isOverCapacity` rule, the slot cap is never used to
   * block this — `LiveSessionInventoryModal` only warns.
   */
  function moveItem(itemId: string, toId: string) {
    if (!openInventoryId) return;
    const from = sourceAndMemberFor(openInventoryId);
    const to = sourceAndMemberFor(toId);
    if (!from || !to) return;
    const item = from.member.items.find((i) => i.id === itemId);
    if (!item) return;

    const beforeFrom = from.member.items;
    const beforeTo = to.member.items;
    const fromId = openInventoryId;

    const updateOwner = (owner: Source, id: string, items: Item[]) =>
      owner === 'party' ? updateMember(id, { items }) : updateHireling(id, { items });

    updateOwner(from.source, fromId, beforeFrom.filter((i) => i.id !== itemId));
    updateOwner(to.source, toId, [...beforeTo, item]);

    announce('item:' + itemId, $_('liveSession.itemMoved', { values: { item: item.name, to: to.member.name } }), () => {
      updateOwner(from.source, fromId, beforeFrom);
      updateOwner(to.source, toId, beforeTo);
    });
    movePickerFor = null;
  }

  function handleBurnCharge(id: string, itemId: string) {
    const found = sourceAndMemberFor(id);
    if (!found) return;
    const { source, member } = found;
    const before = member.items;
    const item = member.items.find((i) => i.id === itemId);
    if (!item) return;

    if (item.charges === 0 || item.charges === null) {
      // Nothing to burn — already empty (or not chargeable at all, which
      // shouldn't be reachable from the modal's tap target). No mutation,
      // so no undo.
      announce('item:' + item.id, $_('liveSession.chargeEmpty', { values: { name: item.name } }));
      return;
    }

    if (source === 'party') tickMemberItemCharge(id, itemId);
    else tickHirelingItemCharge(id, itemId);

    const restore = () => {
      if (source === 'party') updateMember(id, { items: before });
      else updateHireling(id, { items: before });
    };

    const newCharges = item.charges - 1;
    const key = newCharges === 0 ? 'liveSession.chargeUsedUp' : 'liveSession.chargeBurned';
    announce(
      'item:' + item.id,
      $_(key, { values: { name: item.name, current: newCharges, max: item.maxCharges ?? 0 } }),
      restore,
    );
  }

  function handleDamage(source: Source, id: string, amount: number) {
    const member = memberOf(source, id);
    if (!member) return;
    const before = { hp: member.hp, str: member.str };
    const outcome = source === 'party' ? dealDamage(id, amount) : dealHirelingDamage(id, amount);
    if (!outcome) return;

    const restore = () => {
      if (source === 'party') updateMember(id, before);
      else updateHireling(id, before);
    };
    announce(id, $_('liveSession.damageApplied', { values: { amount } }), restore);

    if (outcome.died) {
      // STR hit exactly 0 — immediate death per the rules, no save. Death
      // itself is logged from `confirmDeath` once the GM actually confirms
      // it, not here.
      deathCause = '';
      deathConfirm = { id, source, name: member.name };
    } else if (outcome.strSaveRequired) {
      pendingStrSave = { id, source, str: outcome.newStr };
      logEvent({ kind: 'strDrained', name: member.name, role: source, newStr: outcome.newStr });
    }
  }

  function handleHeal(source: Source, id: string, amount: number) {
    const member = memberOf(source, id);
    if (!member) return;
    const before = { hp: member.hp, str: member.str };
    if (source === 'party') healHp(id, amount);
    else healHirelingHp(id, amount);

    const restore = () => {
      if (source === 'party') updateMember(id, before);
      else updateHireling(id, before);
    };
    announce(id, $_('liveSession.healApplied', { values: { amount } }), restore);
  }

  function handleToggleCondition(source: Source, id: string, condition: ConditionName) {
    const member = memberOf(source, id);
    if (!member) return;
    const has = member.conditions.includes(condition);
    if (source === 'party') {
      if (has) removeCondition(id, condition);
      else addCondition(id, condition);
    } else {
      if (has) removeHirelingCondition(id, condition);
      else addHirelingCondition(id, condition);
    }
    // Only conditions *gained* are recap-worthy — a condition being cleared
    // isn't a notable "thing that happened" the same way.
    if (!has) {
      logEvent({ kind: 'conditionGained', name: member.name, role: source, condition: CONDITIONS[condition].label });
    }
  }

  function resolveStrSave() {
    if (!pendingStrSave) return;
    const { id, source, str } = pendingStrSave;
    const member = memberOf(source, id);
    const result = rollSave(str);
    if (!result.passed) {
      if (source === 'party') {
        addCondition(id, 'injured');
        addCondition(id, 'incapacitated');
      } else {
        addHirelingCondition(id, 'injured');
        addHirelingCondition(id, 'incapacitated');
      }
      if (member) {
        logEvent({ kind: 'conditionGained', name: member.name, role: source, condition: CONDITIONS.injured.label });
        logEvent({ kind: 'conditionGained', name: member.name, role: source, condition: CONDITIONS.incapacitated.label });
      }
    }
    const key = result.passed ? 'liveSession.strSavePassed' : 'liveSession.strSaveFailed';
    announce(id, $_(key, { values: { roll: result.roll, score: result.score } }));
    pendingStrSave = null;
  }

  /**
   * Morale saves never mutate the hireling — the app only reports
   * pass/fail per the rules; the GM narrates the flight on a failed save. So there's no `before` state to
   * capture and no undo, unlike `handleDamage`/`handleHeal`.
   */
  function rollMoraleSaveFor(hireling: Hireling) {
    const result = rollMoraleSave(hireling.wil, hireling.loyal);
    const key = result.passed ? 'liveSession.moraleSavePassed' : 'liveSession.moraleSaveFailed';
    announce('morale:' + hireling.id, $_(key, { values: { roll: result.roll, score: result.score } }));
    // Only failures are recap-worthy — a passed morale save is a non-event.
    if (!result.passed) {
      logEvent({ kind: 'moraleFailed', name: hireling.name });
    }
  }

  function requestDeath(source: Source, id: string) {
    const member = memberOf(source, id);
    if (!member) return;
    deathCause = '';
    deathConfirm = { id, source, name: member.name };
  }

  function confirmDeath() {
    if (!deathConfirm) return;
    const { id, source, name } = deathConfirm;
    // Snapshot role (and level, for party mice) before killing — `killMember`/
    // `killHireling` only flip `status`, but reading after would still work;
    // this just keeps the ledger's source of truth explicit.
    const partyMember = source === 'party' ? party.find((m) => m.id === id) : undefined;
    const hirelingMember = source === 'hireling' ? hirelings.find((h) => h.id === id) : undefined;
    const role = partyMember?.role ?? hirelingMember?.role ?? '';

    if (source === 'party') killMember(id);
    else killHireling(id);
    logEvent({ kind: 'death', name, role: source });

    const cause = deathCause.trim();
    logDeath({
      timestamp: new Date().toISOString(),
      memberId: id,
      name,
      role,
      source,
      ...(cause ? { cause } : {}),
      ...(lastSession ? { sessionNumber: lastSession.number } : {}),
      ...(partyMember ? { level: partyMember.level } : {}),
    });
    deathConfirm = null;
    deathCause = '';
  }

  const openInventory = $derived(openInventoryId ? sourceAndMemberFor(openInventoryId) : null);
  const openInventoryMember = $derived(openInventory?.member ?? null);

  function bumpClock(id: string) {
    const faction = factions.find((f) => f.id === id);
    if (!faction) return;
    const before = faction.clock;
    bumpFactionClock(id, 1);
    announce(`faction:${id}`, $_('liveSession.clockAdvanced', { values: { name: faction.name } }), () =>
      updateFaction(id, { clock: before }),
    );
    logEvent({
      kind: 'factionClockChanged',
      factionId: id,
      name: faction.name,
      from: before,
      to: before + 1,
      max: faction.of,
    });
  }
</script>

{#if endSessionOpen}
  <SessionRecapReview
    events={sessionEvents}
    defaultNumber={getNextSessionNumber()}
    defaultAdventureId={activeBeat?.adventureId ?? null}
    onback={() => (endSessionOpen = false)}
    ondraft={draftRecap}
  />
{:else}
<div class="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
  <LiveSessionHeader
    sessionNumber={lastSession?.number ?? null}
    sessionTitle={lastSession?.title ?? null}
    beatTitle={activeBeat?.title ?? null}
    adventureOptions={needsPicker
      ? activeAdventureOptions.map((o) => ({ id: o.id, title: o.title, beatTitle: o.beat.title }))
      : undefined}
    selectedAdventureId={needsPicker ? effectiveAdventureId : null}
    onselectadventure={(id) => (selectedAdventureId = id)}
    {onexit}
    onopenrules={() => (rulesOpen = true)}
    onendsession={() => (endSessionOpen = true)}
  />

  <RulesDrawer open={rulesOpen} onclose={() => (rulesOpen = false)} />

  <main class="flex-1 w-full max-w-160 mx-auto p-[var(--sp-5)] flex flex-col gap-[var(--sp-5)]">
    <FactionClockStrip
      factions={topFactions}
      notice={notice && notice.id.startsWith('faction:') ? { text: notice.text, undo: notice.undo } : null}
      onbump={bumpClock}
      ondismissnotice={dismissNotice}
    />

    {#if currentAdventure && watchState}
      <LiveSessionWatchCard
        day={watchState.day}
        watch={watchState.watch}
        restedThisDay={watchState.restedThisDay}
        currentHex={activeHex
          ? { id: activeHex.id, name: activeHex.name || `Hex ${activeHex.q},${activeHex.r}`, terrain: activeHex.terrain }
          : null}
        neighbors={neighborOptions}
        suggestedStartHex={suggestedStartHex
          ? {
              id: suggestedStartHex.id,
              name: suggestedStartHex.name || `Hex ${suggestedStartHex.q},${suggestedStartHex.r}`,
              terrain: suggestedStartHex.terrain,
            }
          : null}
        {lastCheckResult}
        {exhaustedPending}
        recipients={forageRecipients}
        {forageResult}
        {showTwoWatchNote}
        notice={notice && notice.id.startsWith('forage:') ? { text: notice.text, undo: notice.undo } : null}
        onstay={handleStay}
        onforage={handleForage}
        onmove={handleMove}
        onsetstart={handleSetStart}
        onaddforagerecipient={handleForageRecipient}
        onapplyexhausted={handleApplyExhausted}
        ondismissexhausted={() => (exhaustedPending = false)}
        ondismissnotice={dismissNotice}
        onnavigate={() => onnavigate?.('hexMap')}
      />
    {/if}

    {#if activeHex}
      <LiveSessionEncounterCard
        hexName={activeHex.name || `Hex ${activeHex.q},${activeHex.r}`}
        hasBestiary={bestiary.length > 0}
        {encounterResult}
        {reactionResult}
        instances={encounterInstances}
        openDrawerId={openDrawer?.kind === 'damage' ? openDrawer.id : null}
        hadInstances={hadEncounterInstances}
        notice={notice && notice.id.startsWith('encounter:') ? { text: notice.text, undo: notice.undo } : null}
        onrollencounter={rollHexEncounter}
        onrollreaction={rollHexEncounterReaction}
        onaddanother={addAnotherInstance}
        ontoggledrawer={(id) => toggleDrawer(id, 'damage')}
        onhurtinstance={damageInstance}
        onhealinstance={healInstance}
        onremoveinstance={removeInstance}
        ondismissnotice={dismissNotice}
      />
    {/if}

    <section class="flex flex-col gap-[var(--sp-3)]">
      <div class="ww-label">{$_('liveSession.party')}</div>
      {#each activeParty as member (member.id)}
        <LiveSessionCard
          member={{
            id: member.id,
            name: member.name,
            role: member.role,
            hp: member.hp,
            max: member.max,
            str: member.str,
            maxStr: member.maxStr,
            conditions: member.conditions,
            items: member.items,
          }}
          drawer={drawerFor(member.id)}
          notice={notice && notice.id === member.id ? { text: notice.text, undo: notice.undo } : null}
          pendingStrSave={pendingStrSave?.id === member.id ? pendingStrSave.str : null}
          ondamage={(amount) => handleDamage('party', member.id, amount)}
          onheal={(amount) => handleHeal('party', member.id, amount)}
          ontoggledrawer={(kind) => toggleDrawer(member.id, kind)}
          ontogglecondition={(condition) => handleToggleCondition('party', member.id, condition)}
          onresolvestrsave={resolveStrSave}
          onrequestdeath={() => requestDeath('party', member.id)}
          ondismissnotice={dismissNotice}
          oninventoryopen={() => (openInventoryId = member.id)}
        />
      {/each}
      {#if activeParty.length === 0}
        <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('liveSession.noParty')}</p>
      {/if}
      {#if fallenParty.length > 0}
        <details>
          <summary class="ww-label cursor-pointer">{$_('liveSession.fallen', { values: { count: fallenParty.length } })}</summary>
          <div class="flex flex-col gap-1.5 mt-2">
            {#each fallenParty as member (member.id)}
              <div class="flex items-center gap-2 text-[var(--text-muted)]">
                <span class="font-bold text-[length:var(--text-sm)]">{member.name}</span>
                <Tag size="sm">{member.role}</Tag>
              </div>
            {/each}
          </div>
        </details>
      {/if}
    </section>

    <section class="flex flex-col gap-[var(--sp-3)]">
      <div class="flex items-center justify-between gap-2">
        <div class="ww-label">{$_('liveSession.hirelings')}</div>
        {#if activeHirelings.length > 0}
          <Button variant="ghost" size="sm" onclick={openPayDay}>{$_('liveSession.payDay')}</Button>
        {/if}
      </div>
      {#each activeHirelings as hireling (hireling.id)}
        <LiveSessionCard
          member={{
            id: hireling.id,
            name: hireling.name,
            role: hireling.role,
            hp: hireling.hp,
            max: hireling.max,
            str: hireling.str,
            maxStr: hireling.maxStr,
            conditions: hireling.conditions,
            items: hireling.items,
            slotCapacity: capacity(HIRELING_LAYOUT),
            morale: { wil: hireling.wil, advantage: hireling.loyal },
          }}
          drawer={drawerFor(hireling.id)}
          notice={notice && (notice.id === hireling.id || notice.id === 'morale:' + hireling.id)
            ? { text: notice.text, undo: notice.undo }
            : null}
          pendingStrSave={pendingStrSave?.id === hireling.id ? pendingStrSave.str : null}
          ondamage={(amount) => handleDamage('hireling', hireling.id, amount)}
          onheal={(amount) => handleHeal('hireling', hireling.id, amount)}
          ontoggledrawer={(kind) => toggleDrawer(hireling.id, kind)}
          ontogglecondition={(condition) => handleToggleCondition('hireling', hireling.id, condition)}
          onresolvestrsave={resolveStrSave}
          onrequestdeath={() => requestDeath('hireling', hireling.id)}
          ondismissnotice={dismissNotice}
          oninventoryopen={() => (openInventoryId = hireling.id)}
          onrollmoralesave={() => rollMoraleSaveFor(hireling)}
        />
      {/each}
      {#if activeHirelings.length === 0}
        <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('liveSession.noHirelings')}</p>
      {/if}
      {#if fallenHirelings.length > 0}
        <details>
          <summary class="ww-label cursor-pointer">
            {$_('liveSession.fallen', { values: { count: fallenHirelings.length } })}
          </summary>
          <div class="flex flex-col gap-1.5 mt-2">
            {#each fallenHirelings as hireling (hireling.id)}
              <div class="flex items-center gap-2 text-[var(--text-muted)]">
                <span class="font-bold text-[length:var(--text-sm)]">{hireling.name}</span>
                <Tag size="sm">{hireling.role}</Tag>
              </div>
            {/each}
          </div>
        </details>
      {/if}
    </section>
  </main>

  <SaveDock members={saveableMembers} />
</div>

<ConfirmDialog
  open={deathConfirm !== null}
  title={$_('liveSession.deathTitle')}
  confirmLabel={$_('liveSession.confirmDeathAction')}
  cancelLabel={$_('liveSession.cancel')}
  danger
  onconfirm={confirmDeath}
  oncancel={() => (deathConfirm = null)}
>
  {#if deathConfirm}
    <div class="flex flex-col gap-[var(--sp-3)]">
      <p class="text-[var(--text-secondary)] text-[length:var(--text-body)]">
        {$_('liveSession.deathMessage', { values: { name: deathConfirm.name } })}
      </p>
      <Input
        label={$_('liveSession.causeOfDeath')}
        placeholder={$_('liveSession.causeOfDeathPlaceholder')}
        size="live"
        bind:value={deathCause}
      />
    </div>
  {/if}
</ConfirmDialog>

<LiveSessionInventoryModal
  open={openInventoryMember !== null}
  name={openInventoryMember?.name ?? ''}
  items={openInventoryMember?.items ?? []}
  layout={openInventory?.source === 'hireling' ? HIRELING_LAYOUT : MOUSE_LAYOUT}
  notice={notice && notice.id.startsWith('item:') ? { text: notice.text, undo: notice.undo } : null}
  {recipients}
  movingItemId={movePickerFor}
  onburn={(itemId) => openInventoryId && handleBurnCharge(openInventoryId, itemId)}
  onclose={() => {
    openInventoryId = null;
    movePickerFor = null;
  }}
  onrequestmove={(itemId) => (movePickerFor = itemId)}
  onmove={moveItem}
  oncancelmove={() => (movePickerFor = null)}
  ondismissnotice={dismissNotice}
/>

<Modal open={payDayOpen} title={$_('liveSession.payDayTitle')} onclose={() => (payDayOpen = false)}>
  <div class="flex flex-col gap-[var(--sp-3)] pb-[var(--sp-4)]">
    {#each activeHirelings as hireling (hireling.id)}
      {@const paid = paidThisSession.has(hireling.id)}
      {@const moraleResult = payDayMoraleResults[hireling.id]}
      <div class="flex flex-col gap-1.5 py-2 border-b border-[var(--border)] last:border-b-0">
        <div class="flex items-center gap-x-[var(--sp-3)] gap-y-1.5 flex-wrap">
          <span class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)] min-w-20">
            {hireling.name}
          </span>
          <span class="ww-num text-[length:var(--text-sm)] text-[var(--text-muted)]">{hireling.wage}p</span>
          <div class="min-h-[var(--tap)] flex items-center">
            <Tag tone={paid ? 'success' : 'default'} solid={paid} onclick={() => togglePaid(hireling.id)}>
              {paid ? $_('liveSession.payDayPaid') : $_('liveSession.payDayUnpaid')}
            </Tag>
          </div>
          {#if !paid}
            <Button variant="secondary" size="sm" onclick={() => rollPayDayMoraleSave(hireling)}>
              {$_('liveSession.rollMoraleSave')}
            </Button>
          {/if}
        </div>
        {#if !paid && moraleResult}
          <span
            class="text-[length:var(--text-sm)] font-bold"
            style:color={moraleResult.passed ? 'var(--success)' : 'var(--danger-hover)'}
          >
            {$_(moraleResult.passed ? 'liveSession.moraleSavePassed' : 'liveSession.moraleSaveFailed', {
              values: { roll: moraleResult.roll, score: moraleResult.score },
            })}
          </span>
        {/if}
      </div>
    {/each}
    {#if activeHirelings.length === 0}
      <p class="text-[var(--text-muted)] text-[length:var(--text-body)]">{$_('liveSession.noHirelings')}</p>
    {/if}
  </div>
</Modal>
{/if}
