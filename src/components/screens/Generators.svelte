<script lang="ts">
  import HelpTip from '../ui/HelpTip.svelte';
  import { Dices, Swords, Package, UserRound, BookOpen } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import AppSidebar, { type NavScreen } from '../layout/AppSidebar.svelte';
  import type { SearchResult } from '../ui/QuickFind.svelte';
  import Button from '../ui/Button.svelte';
  import Card from '../ui/Card.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import DiceRoll from '../ui/DiceRoll.svelte';
  import ReactionResult from '../ui/ReactionResult.svelte';
  import Icon from '../ui/Icon.svelte';
  import StatBlock from '../ui/StatBlock.svelte';
  import Modal from '../ui/Modal.svelte';
  import RulesDrawer from '../ui/RulesDrawer.svelte';
  import HirelingForm from '../forms/HirelingForm.svelte';
  import BestiaryForm from '../forms/BestiaryForm.svelte';
  import { rollDice, type DiceRollResult } from '../../lib/generators/roll';
  import { ITEM_TABLE, generateFrom, generateNpc, type GeneratedNpc } from '../../lib/generators/tables';
  import { generateEncounterFor } from '../../lib/generators/encounters';
  import { rollReaction, type ReactionRollResult } from '../../lib/generators/reaction';
  import { getHexNodes } from '../../lib/stores/hexmap.svelte';
  import { getBestiary, addBestiaryEntry, removeBestiaryEntry, type BestiaryEntry } from '../../lib/stores/bestiary.svelte';
  import { addHireling, removeHireling, type Hireling } from '../../lib/stores/hirelings.svelte';

  interface Props {
    onnavigate: (screen: NavScreen) => void;
    onstartsession?: () => void;
    onselectresult?: (result: SearchResult) => void;
  }

  let { onnavigate, onstartsession, onselectresult }: Props = $props();

  let rulesOpen = $state(false);

  const diceSides = [4, 6, 8, 10, 12, 20];
  let count = $state(2);
  let sides = $state(6);
  let modifier = $state(0);
  let diceResult = $state<DiceRollResult | null>(null);

  function doRollDice() {
    diceResult = rollDice(count, sides, modifier);
  }

  const bestiary = getBestiary();
  const hexNodes = getHexNodes();
  const encounterHexes = $derived(hexNodes.filter((h) => h.encounters.length > 0));

  let selectedHexId = $state<string>('any');
  let encounterResult = $state<BestiaryEntry | null>(null);
  let resultSourceLabel = $state('');
  // Reaction is tied to the specific rolled encounter, not the hex/bestiary
  // pick in general — a fresh encounter roll always clears any previous
  // reaction result rather than leaving a stale one attached to a new beast.
  let reactionResult = $state<ReactionRollResult | null>(null);

  function rollEncounter() {
    encounterResult = generateEncounterFor(selectedHexId, hexNodes, bestiary);
    reactionResult = null;
    if (selectedHexId === 'any') {
      resultSourceLabel = $_('generators.encounter.rolledAny');
    } else {
      const hex = hexNodes.find((h) => h.id === selectedHexId);
      const hexName = hex?.name || `Hex ${hex?.q},${hex?.r}`;
      resultSourceLabel = $_('generators.encounter.rolledFor', { values: { hex: hexName } });
    }
  }

  function rollEncounterReaction() {
    reactionResult = rollReaction();
  }

  let item = $state<string | null>(null);
  let npc = $state<GeneratedNpc | null>(null);

  // Which of the two "save" destinations this rolled NPC has already been
  // committed to — a fresh roll (see rollNpc below) resets both back to
  // 'idle' since it's a different NPC. Saving to one destination doesn't
  // disable the other: a GM might reasonably want the same rolled NPC as
  // both a hireling and a bestiary stat block.
  let npcSaveState = $state<{ roster: 'idle' | 'saved'; bestiary: 'idle' | 'saved' }>({
    roster: 'idle',
    bestiary: 'idle',
  });
  let npcRosterId = $state<string | null>(null);
  let npcBestiaryId = $state<string | null>(null);
  let npcModal = $state<'roster' | 'bestiary' | null>(null);

  const npcRosterInitial = $derived<Hireling | undefined>(
    npc
      ? {
          id: '',
          name: npc.name,
          role: npc.role,
          hp: 3,
          max: 3,
          str: 10,
          maxStr: 10,
          dex: 10,
          wil: 10,
          loyal: false,
          wage: 0,
          status: 'active',
          conditions: [],
          scars: [],
          items: [],
          notes: `Quirk: ${npc.quirk}\nWants: ${npc.want}`,
        }
      : undefined,
  );

  const npcBestiaryInitial = $derived<BestiaryEntry | undefined>(
    npc
      ? {
          id: '',
          name: npc.name,
          category: 'Humanoid',
          hd: 1,
          hp: 3,
          armor: 0,
          attacks: [],
          special: '',
          notes: `Role: ${npc.role}\nQuirk: ${npc.quirk}\nWants: ${npc.want}`,
        }
      : undefined,
  );

  // Same local "last action" notice pattern as LiveSession.svelte — a single
  // GM acting on a single rolled NPC at a time doesn't need per-card timers.
  interface Notice {
    id: string;
    text: string;
    undo?: (() => void) | undefined;
  }
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

  function undoNotice() {
    notice?.undo?.();
    dismissNotice();
  }

  function rollNpc() {
    npc = generateNpc();
    npcSaveState = { roster: 'idle', bestiary: 'idle' };
    npcRosterId = null;
    npcBestiaryId = null;
    dismissNotice();
  }

  function saveNpcToRoster(data: Omit<Hireling, 'id'>) {
    if (!npc) return;
    const id = addHireling(data);
    npcRosterId = id;
    npcSaveState = { ...npcSaveState, roster: 'saved' };
    npcModal = null;
    announce('npc-card', $_('generators.npc.noticeSavedToRoster', { values: { name: npc.name } }), () => {
      removeHireling(id);
      npcRosterId = null;
      npcSaveState = { ...npcSaveState, roster: 'idle' };
    });
  }

  function saveNpcToBestiary(data: Omit<BestiaryEntry, 'id'>) {
    if (!npc) return;
    const id = addBestiaryEntry(data);
    npcBestiaryId = id;
    npcSaveState = { ...npcSaveState, bestiary: 'saved' };
    npcModal = null;
    announce('npc-card', $_('generators.npc.noticeSavedToBestiary', { values: { name: npc.name } }), () => {
      removeBestiaryEntry(id);
      npcBestiaryId = null;
      npcSaveState = { ...npcSaveState, bestiary: 'idle' };
    });
  }
</script>

<div class="flex flex-col md:flex-row min-h-screen bg-[var(--bg)] text-[var(--text)]">
  <AppSidebar active="generators" {onnavigate} {onstartsession} {onselectresult} />

  <main class="flex-1 p-[var(--sp-6)] max-w-[var(--content-max)] flex flex-col gap-[var(--sp-5)]">
    <header class="flex items-center justify-between gap-[var(--sp-3)]">
      <div>
        <div class="ww-label text-[var(--accent)]">{$_('generators.eyebrow')}</div>
        <h1 class="text-[length:var(--text-h1)] mt-1">{$_('generators.title')}</h1>
      </div>
      <button
        onclick={() => (rulesOpen = true)}
        aria-label={$_('generators.rulesAriaLabel')}
        class="inline-flex items-center justify-center min-h-[var(--tap)] min-w-[var(--tap)] shrink-0 bg-none border-none text-[var(--text-muted)] cursor-pointer"
      >
        <Icon icon={BookOpen} />
      </button>
    </header>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-[var(--sp-4)]">
      <!-- Dice -->
      <Card eyebrow={$_('generators.dice.eyebrow')} title={$_('generators.dice.title')}>
        <div class="flex flex-col gap-[var(--sp-4)]">
          <div class="flex gap-[var(--sp-5)] flex-wrap">
            <Stepper label={$_('generators.dice.count')} value={count} min={1} max={6} size="md" onchange={(v) => (count = v)} />
            <div class="flex flex-col gap-1.5 items-center">
              <span class="ww-label">{$_('generators.dice.sides')}</span>
              <select
                bind:value={sides}
                class="h-10 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-[length:var(--text-body)] w-fit"
              >
                {#each diceSides as s (s)}
                  <option value={s}>d{s}</option>
                {/each}
              </select>
            </div>
            <Stepper
              label={$_('generators.dice.modifier')}
              value={modifier}
              min={-5}
              max={5}
              size="md"
              onchange={(v) => (modifier = v)}
            />
          </div>
          <Button variant="primary" onclick={doRollDice}>
            {#snippet icon()}
              <Icon icon={Dices} />
            {/snippet}
            {$_('generators.dice.roll')}
          </Button>
          {#if diceResult}
            <DiceRoll
              dice={diceResult.dice}
              notation={diceResult.notation}
              total={diceResult.total}
              outcome="neutral"
            />
          {/if}
        </div>
      </Card>

      <!-- Encounter -->
      <Card eyebrow={$_('generators.encounter.eyebrow')} title={$_('generators.encounter.title')}>
        <div class="flex flex-col gap-[var(--sp-4)]">
          <div class="flex flex-col gap-1.5">
            <span class="ww-label">{$_('generators.encounter.hexLabel')}</span>
            <select
              bind:value={selectedHexId}
              aria-label={$_('generators.encounter.hexLabel')}
              class="h-[var(--tap)] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)]"
            >
              <option value="any">{$_('generators.encounter.anyHex')}</option>
              {#each encounterHexes as hex (hex.id)}
                <option value={hex.id}>{hex.name || `Hex ${hex.q},${hex.r}`}</option>
              {/each}
            </select>
          </div>

          {#if bestiary.length === 0}
            <Button variant="secondary" disabled>
              {#snippet icon()}
                <Icon icon={Swords} />
              {/snippet}
              {$_('generators.encounter.roll')}
            </Button>
            <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('generators.encounter.noBestiary')}</p>
          {:else}
            <Button variant="secondary" onclick={rollEncounter}>
              {#snippet icon()}
                <Icon icon={Swords} />
              {/snippet}
              {$_('generators.encounter.roll')}
            </Button>
            {#if encounterResult}
              <div class="bg-[var(--surface-sunk)] rounded-[var(--radius-md)] p-[var(--sp-3)] flex flex-col gap-[var(--sp-3)]">
                <div>
                  <p class="text-[length:var(--text-caption)] text-[var(--text-muted)] mb-1">{resultSourceLabel}</p>
                  <StatBlock entry={encounterResult} statGap="var(--sp-3)" />
                </div>
                <div class="flex items-center gap-[var(--sp-2)]">
                  <div class="flex-1 min-w-0 flex flex-col">
                    <Button variant="secondary" size="sm" onclick={rollEncounterReaction}>
                      {$_('generators.encounter.reaction.roll')}
                    </Button>
                  </div>
                  <HelpTip text={$_('help.reaction')} label={$_('help.reactionLabel')} />
                </div>
                {#if reactionResult}
                  <ReactionResult result={reactionResult} />
                {/if}
              </div>
            {/if}
          {/if}
        </div>
      </Card>

      <!-- Item -->
      <Card eyebrow={$_('generators.item.eyebrow')} title={$_('generators.item.title')}>
        <div class="flex flex-col gap-[var(--sp-4)]">
          <Button variant="secondary" onclick={() => (item = generateFrom(ITEM_TABLE))}>
            {#snippet icon()}
              <Icon icon={Package} />
            {/snippet}
            {$_('generators.item.roll')}
          </Button>
          {#if item}
            <p class="bg-[var(--surface-sunk)] rounded-[var(--radius-md)] p-[var(--sp-3)] text-[length:var(--text-body)] text-[var(--text-secondary)]">
              {item}
            </p>
          {/if}
        </div>
      </Card>

      <!-- NPC -->
      <Card eyebrow={$_('generators.npc.eyebrow')} title={$_('generators.npc.title')}>
        <div class="flex flex-col gap-[var(--sp-4)]">
          <Button variant="secondary" onclick={rollNpc}>
            {#snippet icon()}
              <Icon icon={UserRound} />
            {/snippet}
            {$_('generators.npc.roll')}
          </Button>
          {#if npc}
            <div class="bg-[var(--surface-sunk)] rounded-[var(--radius-md)] p-[var(--sp-3)] flex flex-col gap-1">
              <div
                data-testid="npc-name"
                class="font-[family-name:var(--font-display)] font-bold text-[length:var(--text-title)]"
              >
                {npc.name}
              </div>
              <div class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{npc.role}</div>
              <div class="text-[length:var(--text-body)] text-[var(--text-secondary)] mt-1">
                <span class="ww-label">{$_('generators.npc.quirk')}</span>
                {npc.quirk}
              </div>
              <div class="text-[length:var(--text-body)] text-[var(--text-secondary)]">
                <span class="ww-label">{$_('generators.npc.want')}</span>
                {npc.want}
              </div>

              <div class="flex flex-col gap-2 sm:flex-row sm:gap-3 mt-[var(--sp-3)]">
                <Button
                  variant={npcSaveState.roster === 'saved' ? 'ghost' : 'secondary'}
                  size="md"
                  block
                  disabled={npcSaveState.roster === 'saved'}
                  onclick={() => (npcModal = 'roster')}
                >
                  {npcSaveState.roster === 'saved' ? $_('generators.npc.savedToRoster') : $_('generators.npc.saveToRoster')}
                </Button>
                <Button
                  variant={npcSaveState.bestiary === 'saved' ? 'ghost' : 'secondary'}
                  size="md"
                  block
                  disabled={npcSaveState.bestiary === 'saved'}
                  onclick={() => (npcModal = 'bestiary')}
                >
                  {npcSaveState.bestiary === 'saved'
                    ? $_('generators.npc.savedToBestiary')
                    : $_('generators.npc.saveToBestiary')}
                </Button>
              </div>

              {#if notice && notice.id === 'npc-card'}
                <div class="flex items-center justify-between gap-2 mt-1">
                  <span class="text-[length:var(--text-sm)] text-[var(--text-secondary)]">{notice.text}</span>
                  {#if notice.undo}
                    <button
                      type="button"
                      onclick={undoNotice}
                      class="font-bold text-[var(--accent)] text-[length:var(--text-sm)] cursor-pointer bg-none border-none"
                    >
                      {$_('liveSession.undo')}
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </Card>
    </div>
  </main>
</div>

<Modal
  open={npcModal === 'roster'}
  eyebrow={$_('generators.npc.rosterModalEyebrow')}
  title={npc ? $_('generators.npc.rosterModalTitle', { values: { name: npc.name } }) : undefined}
  onclose={() => (npcModal = null)}
>
  {#if npcModal === 'roster' && npc}
    <HirelingForm initial={npcRosterInitial} onsave={saveNpcToRoster} oncancel={() => (npcModal = null)} />
  {/if}
</Modal>

<Modal
  open={npcModal === 'bestiary'}
  eyebrow={$_('generators.npc.bestiaryModalEyebrow')}
  title={npc ? $_('generators.npc.bestiaryModalTitle', { values: { name: npc.name } }) : undefined}
  onclose={() => (npcModal = null)}
>
  {#if npcModal === 'bestiary' && npc}
    <BestiaryForm initial={npcBestiaryInitial} onsave={saveNpcToBestiary} oncancel={() => (npcModal = null)} />
  {/if}
</Modal>

<RulesDrawer open={rulesOpen} onclose={() => (rulesOpen = false)} />
