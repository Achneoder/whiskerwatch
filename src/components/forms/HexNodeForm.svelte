<script lang="ts">
  import HelpTip from '../ui/HelpTip.svelte';
  import { X } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Textarea from '../ui/Textarea.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import type { HexEncounter, HexNode, HexTerrain } from '../../lib/stores/hexmap.svelte';
  import type { BestiaryEntry } from '../../lib/stores/bestiary.svelte';
  import type { Faction } from '../../lib/stores/factions.svelte';

  interface Props {
    initial?: HexNode | undefined;
    bestiary?: BestiaryEntry[];
    factions?: Faction[];
    onsave: (data: Omit<HexNode, 'id' | 'q' | 'r'>) => void;
    oncancel: () => void;
  }

  let { initial, bestiary = [], factions = [], onsave, oncancel }: Props = $props();

  const terrains: HexTerrain[] = ['meadow', 'hedgerow', 'forest', 'water', 'hills', 'ruins', 'settlement'];

  let terrain = $state<HexTerrain>(initial?.terrain ?? 'meadow');
  let name = $state(initial?.name ?? '');
  let notes = $state(initial?.notes ?? '');
  let discovered = $state(initial?.discovered ?? false);
  let encounters = $state<HexEncounter[]>(initial?.encounters ? [...initial.encounters] : []);
  let newBestiaryId = $state('');
  let newWeight = $state(1);
  let controlledBy = $state<string | null>(initial?.controlledBy ?? null);
  let contestedBy = $state<string[]>(initial?.contestedBy ? [...initial.contestedBy] : []);
  let newContesterId = $state('');

  const availableContesters = $derived(
    factions.filter((f) => f.id !== controlledBy && !contestedBy.includes(f.id)),
  );

  function setControlledBy(factionId: string) {
    controlledBy = factionId === '' ? null : factionId;
    if (controlledBy) {
      contestedBy = contestedBy.filter((id) => id !== controlledBy);
    }
  }

  function addContester() {
    if (!newContesterId) return;
    contestedBy = [...contestedBy, newContesterId];
    newContesterId = '';
  }

  function removeContester(factionId: string) {
    contestedBy = contestedBy.filter((id) => id !== factionId);
  }

  const linkedEntries = $derived(
    encounters
      .map((e) => ({ encounter: e, entry: bestiary.find((b) => b.id === e.bestiaryId) }))
      .filter((r): r is { encounter: HexEncounter; entry: BestiaryEntry } => r.entry !== undefined),
  );
  const availableEntries = $derived(bestiary.filter((b) => !encounters.some((e) => e.bestiaryId === b.id)));

  function addEncounter() {
    if (!newBestiaryId) return;
    encounters.push({ bestiaryId: newBestiaryId, weight: newWeight });
    newBestiaryId = '';
    newWeight = 1;
  }

  function removeEncounter(bestiaryId: string) {
    encounters = encounters.filter((e) => e.bestiaryId !== bestiaryId);
  }

  function setEncounterWeight(bestiaryId: string, weight: number) {
    encounters = encounters.map((e) => (e.bestiaryId === bestiaryId ? { ...e, weight } : e));
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    onsave({ terrain, name: name.trim(), notes: notes.trim(), discovered, encounters, controlledBy, contestedBy });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--sp-4)]">
  <div class="flex flex-col gap-1.5">
    <span class="flex items-center gap-1.5">
      <span class="ww-label">{$_('hexMap.form.terrain')}</span>
      <HelpTip text={$_('help.terrain')} label={$_('hexMap.form.terrain')} />
    </span>
    <select
      bind:value={terrain}
      class="h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)] w-fit"
    >
      {#each terrains as t (t)}
        <option value={t}>{$_(`hexMap.terrain.${t}`)}</option>
      {/each}
    </select>
  </div>

  <Input label={$_('hexMap.form.name')} bind:value={name} placeholder={$_('hexMap.form.namePlaceholder')} />

  <Textarea label={$_('hexMap.form.notes')} bind:value={notes} rows={3} />

  <div class="flex flex-col gap-[var(--sp-3)]">
    <span class="ww-label">{$_('hexMap.form.territory')}</span>

    <div class="flex flex-col gap-1.5">
      <span class="ww-label">{$_('hexMap.form.controlledBy')}</span>
      <select
        value={controlledBy ?? ''}
        onchange={(e) => setControlledBy(e.currentTarget.value)}
        aria-label={$_('hexMap.form.controlledBy')}
        class="h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)] w-fit"
      >
        <option value="">{$_('hexMap.form.controlledByNone')}</option>
        {#each factions as f (f.id)}
          <option value={f.id}>{f.name}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-2">
      <span class="ww-label">{$_('hexMap.form.contestedBy')}</span>
      {#if contestedBy.length > 0}
        <ul class="flex flex-col gap-1.5">
          {#each contestedBy as factionId (factionId)}
            {@const faction = factions.find((f) => f.id === factionId)}
            {#if faction}
              <li class="flex items-center gap-2 flex-wrap py-1.5 px-2 bg-[var(--surface-sunk)] rounded-[var(--radius-sm)]">
                <span class="text-[length:var(--text-sm)] flex-1 min-w-0">{faction.name}</span>
                <button
                  type="button"
                  aria-label={$_('roster.delete')}
                  onclick={() => removeContester(faction.id)}
                  class="grid place-items-center w-8 h-8 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
                >
                  <Icon icon={X} />
                </button>
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
      {#if availableContesters.length > 0}
        <div class="flex gap-2 flex-wrap items-end">
          <select
            bind:value={newContesterId}
            aria-label={$_('hexMap.form.contestingFaction')}
            class="h-[var(--tap)] flex-1 min-w-0 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)]"
          >
            <option value="" disabled>{$_('hexMap.form.contestedByPlaceholder')}</option>
            {#each availableContesters as f (f.id)}
              <option value={f.id}>{f.name}</option>
            {/each}
          </select>
          <Button type="button" variant="secondary" size="sm" onclick={addContester} disabled={!newContesterId}>
            {$_('hexMap.form.addContested')}
          </Button>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <span class="flex items-center gap-1.5">
      <span class="ww-label">{$_('hexMap.form.encounters')}</span>
      <HelpTip text={$_('help.encounters')} label={$_('hexMap.form.encounters')} />
    </span>
    {#if bestiary.length === 0}
      <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('hexMap.form.encountersNoBestiary')}</p>
    {:else}
      {#if linkedEntries.length > 0}
        <ul class="flex flex-col gap-1.5">
          {#each linkedEntries as { encounter, entry } (entry.id)}
            <li class="flex items-center gap-2 flex-wrap py-1.5 px-2 bg-[var(--surface-sunk)] rounded-[var(--radius-sm)]">
              <span class="text-[length:var(--text-sm)] flex-1 min-w-0">
                {entry.name} · weight {encounter.weight}
              </span>
              <Stepper
                size="sm"
                min={1}
                max={6}
                value={encounter.weight}
                onchange={(v) => setEncounterWeight(entry.id, v)}
              />
              <button
                type="button"
                aria-label={$_('roster.delete')}
                onclick={() => removeEncounter(entry.id)}
                class="grid place-items-center w-8 h-8 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
              >
                <Icon icon={X} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if availableEntries.length > 0}
        <div class="flex gap-2 flex-wrap items-end">
          <select
            bind:value={newBestiaryId}
            aria-label="Bestiary entry"
            class="h-[var(--tap)] flex-1 min-w-0 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)]"
          >
            <option value="" disabled>{$_('hexMap.form.encounterPlaceholder')}</option>
            {#each availableEntries as b (b.id)}
              <option value={b.id}>{b.name}</option>
            {/each}
          </select>
          <Stepper label="Weight" size="sm" min={1} max={6} value={newWeight} onchange={(v) => (newWeight = v)} />
          <Button type="button" variant="secondary" size="sm" onclick={addEncounter} disabled={!newBestiaryId}>
            {$_('hexMap.form.addEncounter')}
          </Button>
        </div>
      {/if}
    {/if}
  </div>

  <label class="flex items-center gap-2 text-[length:var(--text-body)] cursor-pointer">
    <input type="checkbox" bind:checked={discovered} class="w-4 h-4 accent-[var(--accent)]" />
    {$_('hexMap.form.discovered')}
  </label>

  <div class="flex justify-end gap-[var(--gap-inline)] pt-[var(--sp-2)]">
    <Button type="button" variant="ghost" onclick={oncancel}>{$_('roster.form.cancel')}</Button>
    <Button type="submit" variant="primary">{$_('roster.form.save')}</Button>
  </div>
</form>
