import { describe, expect, it, beforeEach } from 'vitest';
import {
  getLiveSessionEvents,
  logEvent,
  clearLog,
  describeEvent,
  groupForEvent,
} from './liveSessionLog.svelte';

describe('liveSessionLog', () => {
  beforeEach(() => {
    clearLog();
  });

  it('assigns a stable id to logged events and keeps them in log order', () => {
    logEvent({ kind: 'death', name: 'Pip', role: 'party' });
    logEvent({ kind: 'moraleFailed', name: 'Oat' });

    const events = getLiveSessionEvents();
    expect(events).toHaveLength(2);
    expect(events[0]!.id).toBeTruthy();
    expect(events[1]!.id).toBeTruthy();
    expect(events[0]!.id).not.toBe(events[1]!.id);
  });

  it('clears the log', () => {
    logEvent({ kind: 'death', name: 'Pip', role: 'party' });
    clearLog();

    expect(getLiveSessionEvents()).toHaveLength(0);
  });

  describe('describeEvent', () => {
    it('describes a resolved beat', () => {
      expect(
        describeEvent({ id: '1', kind: 'beatStatusChanged', beatId: 'b1', title: 'The granary raid', from: 'active', to: 'done' }),
      ).toBe("Resolved: 'The granary raid'");
    });

    it('describes an advanced (not resolved) beat with a from/to arrow', () => {
      expect(
        describeEvent({ id: '1', kind: 'beatStatusChanged', beatId: 'b1', title: 'The granary raid', from: 'planned', to: 'active' }),
      ).toBe("Advanced: 'The granary raid' (planned → active)");
    });

    it('describes a faction clock change with from/to over max', () => {
      expect(
        describeEvent({ id: '1', kind: 'factionClockChanged', factionId: 'f1', name: 'The Court', from: 3, to: 4, max: 6 }),
      ).toBe('The Court clock 3/6 → 4/6');
    });

    it('describes STR drained without using the word "damage"', () => {
      const text = describeEvent({ id: '1', kind: 'strDrained', name: 'Pip', role: 'party', newStr: 4 });
      expect(text).toBe("Pip's STR drained to 4");
      expect(text.toLowerCase()).not.toContain('damage');
    });

    it('describes a gained scar using "scar" wording, not "wound" or "injury"', () => {
      const text = describeEvent({
        id: '1',
        kind: 'scarGained',
        name: 'Pip',
        role: 'party',
        scarLabel: 'Missing an eye',
        scarNote: '-1 to ranged attacks',
      });
      expect(text).toBe("Pip gained the scar 'Missing an eye' — -1 to ranged attacks");
    });

    it('describes advancement as "reached level N", not "leveled up"', () => {
      const text = describeEvent({ id: '1', kind: 'advancement', name: 'Pip', role: 'party', newLevel: 2 });
      expect(text).toBe('Pip reached level 2');
      expect(text.toLowerCase()).not.toContain('leveled up');
    });

    it('describes a failed morale save', () => {
      expect(describeEvent({ id: '1', kind: 'moraleFailed', name: 'Oat' })).toBe('Oat failed a morale save');
    });
  });

  describe('groupForEvent', () => {
    it('groups beat events under beats', () => {
      expect(
        groupForEvent({ id: '1', kind: 'beatStatusChanged', beatId: 'b1', title: 'x', from: 'a', to: 'b' }),
      ).toBe('beats');
    });

    it('groups faction clock events under factions', () => {
      expect(
        groupForEvent({ id: '1', kind: 'factionClockChanged', factionId: 'f1', name: 'x', from: 1, to: 2, max: 6 }),
      ).toBe('factions');
    });

    it('groups morale failures under hirelings regardless of role', () => {
      expect(groupForEvent({ id: '1', kind: 'moraleFailed', name: 'Oat' })).toBe('hirelings');
    });

    it('groups role-bearing events by their role', () => {
      expect(groupForEvent({ id: '1', kind: 'death', name: 'Pip', role: 'party' })).toBe('party');
      expect(groupForEvent({ id: '1', kind: 'death', name: 'Oat', role: 'hireling' })).toBe('hirelings');
    });
  });
});
