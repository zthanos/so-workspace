import { describe, it, expect } from 'vitest';

describe('Diagram Previewer Setup', () => {
  it('should have vitest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should be able to import types', async () => {
    const types = await import('../../src/diagram-previewer/types');
    expect(types).toBeDefined();
  });
});
