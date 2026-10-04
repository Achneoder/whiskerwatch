<script lang="ts">
  import HelpTip from '../ui/HelpTip.svelte';
  import { X } from 'lucide-svelte';
  import { _ } from 'svelte-i18n';
  import Input from '../ui/Input.svelte';
  import Textarea from '../ui/Textarea.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import Button from '../ui/Button.svelte';
  import Icon from '../ui/Icon.svelte';
  import type { Faction, FactionDisposition } from '../../lib/stores/factions.svelte';
  import type { FactionEdge, FactionRelationType } from '../../lib/stores/factionEdges.svelte';
  import type { Beat } from '../../lib/stores/beats.svelte';

  interface Props {
    initial?: Faction | undefined;
    onsave: (data: Omit<Faction, 'id'>) => void;
    oncancel: () => void;
    otherFactions?: Faction[];
    edges?: FactionEdge[];
    beats?: Beat[];
    onaddedge?: (edge: Omit<FactionEdge, 'id'>) => void;
    onremoveedge?: (id: string) => void;
  }

  let { initial, onsave, oncancel, otherFactions = [], edges = [], beats = [], onaddedge, onremoveedge }: Props = $props();

  const dispositions: FactionDisposition[] = ['hostile', 'neutral', 'ally'];
  const relationTypes: FactionRelationType[] = ['ally', 'enemy', 'rival'];

  let name = $state(initial?.name ?? '');
  let disposition = $state<FactionDisposition>(initial?.disposition ?? 'neutral');
  let clock = $state(initial?.clock ?? 0);
  let of = $state(initial?.of ?? 6);
  let note = $state(initial?.note ?? '');
  let tags = $state<string[]>(initial ? [...initial.tags] : []);
  let newTag = $state('');

  let newRelTarget = $state('');
  let newRelType = $state<FactionRelationType>('ally');

  // Relationships touching this faction (only meaningful in edit mode).
  const ownEdges = $derived(initial ? edges.filter((e) => e.sourceId === initial.id || e.targetId === initial.id) : []);

  function otherEnd(edge: FactionEdge): string {
    const otherId = initial && edge.sourceId === initial.id ? edge.targetId : edge.sourceId;
    return otherFactions.find((f) => f.id === otherId)?.name ?? '—';
  }

  function setOf(v: number) {
    of = v;
    if (clock > of) clock = of;
  }

  function addTag() {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    tags.push(trimmed);
    newTag = '';
  }

  function removeTag(index: number) {
    tags.splice(index, 1);
  }

  function addRelationship() {
    if (!initial || !newRelTarget) return;
    onaddedge?.({ sourceId: initial.id, targetId: newRelTarget, type: newRelType });
    newRelTarget = '';
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onsave({ name: name.trim(), disposition, clock, of, note: note.trim(), tags });
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-[var(--sp-4)]">
  <Input label={$_('factions.form.name')} bind:value={name} required />

  <div class="flex flex-col gap-1.5">
    <span class="flex items-center gap-1.5">
      <span class="ww-label">{$_('factions.form.disposition')}</span>
      <HelpTip text={$_('help.disposition')} label={$_('factions.form.disposition')} />
    </span>
    <select
      bind:value={disposition}
      class="h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)] w-fit"
    >
      {#each dispositions as d (d)}
        <option value={d}>{$_(`factions.disposition.${d}`)}</option>
      {/each}
    </select>
  </div>

  <div class="flex gap-[var(--sp-5)] flex-wrap">
    <Stepper label={$_('factions.form.clock')} help={$_('help.clock')} value={clock} min={0} max={of} size="md" onchange={(v) => (clock = v)} />
    <Stepper label={$_('factions.form.of')} value={of} min={1} max={12} size="md" onchange={setOf} />
  </div>

  <Textarea label={$_('factions.form.note')} bind:value={note} rows={3} />

  <div class="flex flex-col gap-2">
    <span class="ww-label">{$_('factions.form.tags')}</span>
    {#if tags.length > 0}
      <ul class="flex gap-1.5 flex-wrap">
        {#each tags as tag, i (tag)}
          <li
            class="flex items-center gap-1 py-1 px-2 bg-[var(--surface-sunk)] rounded-[var(--radius-sm)] text-[length:var(--text-sm)]"
          >
            {tag}
            <button
              type="button"
              aria-label={$_('roster.delete')}
              onclick={() => removeTag(i)}
              class="grid place-items-center w-5 h-5 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
            >
              <Icon icon={X} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    <div class="flex gap-2 flex-wrap">
      <div class="flex-1 min-w-32">
        <Input bind:value={newTag} size="sm" placeholder={$_('factions.form.tagPlaceholder')} />
      </div>
      <Button type="button" variant="secondary" size="sm" onclick={addTag}>{$_('roster.form.addCondition')}</Button>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <span class="ww-label">{$_('factions.form.relationships')}</span>
    {#if !initial}
      <p class="text-[length:var(--text-sm)] text-[var(--text-muted)]">{$_('factions.form.relationshipsAddFirst')}</p>
    {:else}
      {#if ownEdges.length > 0}
        <ul class="flex flex-col gap-1.5">
          {#each ownEdges as edge (edge.id)}
            <li
              class="flex items-center justify-between gap-2 py-1.5 px-3 bg-[var(--surface-sunk)] rounded-[var(--radius-md)] text-[length:var(--text-sm)]"
            >
              <span><strong class="font-semibold">{$_(`factions.relation.${edge.type}`)}</strong> · {otherEnd(edge)}</span>
              <button
                type="button"
                aria-label={$_('roster.delete')}
                onclick={() => onremoveedge?.(edge.id)}
                class="grid place-items-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--danger)] hover:bg-[var(--danger-tint)] cursor-pointer"
              >
                <Icon icon={X} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if otherFactions.length > 0}
        <div class="flex gap-2 flex-wrap">
          <select
            bind:value={newRelType}
            aria-label={$_('factions.form.relationType')}
            class="h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)]"
          >
            {#each relationTypes as t (t)}
              <option value={t}>{$_(`factions.relation.${t}`)}</option>
            {/each}
          </select>
          <select
            bind:value={newRelTarget}
            aria-label={$_('factions.form.targetPlaceholder')}
            class="h-[var(--tap)] flex-1 min-w-30 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-[var(--pad-control-x)] text-[length:var(--text-body)]"
          >
            <option value="" disabled>{$_('factions.form.targetPlaceholder')}</option>
            {#each otherFactions as f (f.id)}
              <option value={f.id}>{f.name}</option>
            {/each}
          </select>
          <Button type="button" variant="secondary" size="sm" onclick={addRelationship}>
            {$_('factions.form.addRelationship')}
          </Button>
        </div>
      {/if}
    {/if}
  </div>

  {#if initial && beats.length > 0}
    <div class="flex flex-col gap-2">
      <span class="ww-label">{$_('factions.form.beats')}</span>
      <ul class="flex gap-1.5 flex-wrap">
        {#each beats as beat (beat.id)}
          <li class="py-1 px-2 bg-[var(--surface-sunk)] rounded-[var(--radius-sm)] text-[length:var(--text-sm)]">
            {beat.title}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="flex justify-end gap-[var(--gap-inline)] pt-[var(--sp-2)]">
    <Button type="button" variant="ghost" onclick={oncancel}>{$_('roster.form.cancel')}</Button>
    <Button type="submit" variant="primary">{$_('roster.form.save')}</Button>
  </div>
</form>
