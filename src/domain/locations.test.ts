import { describe, expect, it } from 'vitest';
import { locationSuggestions } from './locations';
import { makeTask } from './testUtils';

const NOW = new Date(2026, 10, 3, 12, 0);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

describe('locationSuggestions', () => {
  it('suggests locations of open and recent tasks, newest first, each once', () => {
    const tasks = [
      makeTask({ location: 'Library', deadline: daysAgo(10), status: 'done' }),
      makeTask({ location: 'home', deadline: daysAgo(-3) }),
      makeTask({ location: ' library ', deadline: daysAgo(-1) }),
      makeTask({ location: '', deadline: daysAgo(-2) }),
      makeTask({ deadline: daysAgo(-2) }),
    ];
    expect(locationSuggestions(tasks, NOW)).toEqual(['home', 'library']);
  });

  it('forgets locations of finished tasks after 60 days, but keeps those of open tasks', () => {
    const tasks = [
      makeTask({ location: 'Old typo', deadline: daysAgo(61), status: 'done' }),
      makeTask({ location: 'School', deadline: daysAgo(90), status: 'open' }),
      makeTask({ location: 'Café', deadline: daysAgo(59), status: 'dropped' }),
    ];
    expect(locationSuggestions(tasks, NOW)).toEqual(['Café', 'School']);
  });
});
