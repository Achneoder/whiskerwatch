import type { Faction } from './factions.svelte';
import type { FactionEdge } from './factionEdges.svelte';
import { DEMO_FACTIONS } from '../demoCampaign';

/**
 * Shared seed for the two faction stores. Faction ids are generated once here
 * so the edge seed can reference them by id, without either `.svelte.ts` store
 * having to import the other at module-evaluation time (which would risk a
 * circular-import crash). Both stores import their seed from this plain module.
 */

const gnawingCourt = crypto.randomUUID();
const owlBridge = crypto.randomUUID();
const seedKeepers = crypto.randomUUID();
const reevesGuild = crypto.randomUUID();
const militia = crypto.randomUUID();

export const seedFactions: Faction[] = [
  {
    id: gnawingCourt,
    ...DEMO_FACTIONS[0]!.en,
    disposition: 'hostile',
    clock: 3,
    of: 6,
  },
  {
    id: owlBridge,
    ...DEMO_FACTIONS[1]!.en,
    disposition: 'neutral',
    clock: 1,
    of: 4,
  },
  {
    id: seedKeepers,
    ...DEMO_FACTIONS[2]!.en,
    disposition: 'ally',
    clock: 5,
    of: 6,
  },
  {
    id: reevesGuild,
    ...DEMO_FACTIONS[3]!.en,
    disposition: 'neutral',
    clock: 2,
    of: 6,
  },
  {
    id: militia,
    ...DEMO_FACTIONS[4]!.en,
    disposition: 'ally',
    clock: 3,
    of: 8,
  },
];

export const seedFactionEdges: FactionEdge[] = [
  { id: crypto.randomUUID(), sourceId: gnawingCourt, targetId: militia, type: 'enemy' },
  { id: crypto.randomUUID(), sourceId: gnawingCourt, targetId: seedKeepers, type: 'enemy' },
  { id: crypto.randomUUID(), sourceId: gnawingCourt, targetId: reevesGuild, type: 'enemy' },
  { id: crypto.randomUUID(), sourceId: seedKeepers, targetId: militia, type: 'ally' },
  { id: crypto.randomUUID(), sourceId: reevesGuild, targetId: seedKeepers, type: 'rival' },
  { id: crypto.randomUUID(), sourceId: reevesGuild, targetId: owlBridge, type: 'ally' },
  { id: crypto.randomUUID(), sourceId: owlBridge, targetId: militia, type: 'rival' },
];
