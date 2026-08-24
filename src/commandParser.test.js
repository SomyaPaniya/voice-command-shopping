import { parseCommand } from './commandParser';

describe('Command Parser (Phase 2)', () => {
  describe('Add Commands', () => {
    it('handles simple add without quantity', () => {
      const result = parseCommand('add milk');
      expect(result).toEqual({ action: 'add', item: 'milk', quantity: 1 });
    });

    it('handles "I need" syntax without quantity', () => {
      const result = parseCommand('I need apples');
      expect(result).toEqual({ action: 'add', item: 'apples', quantity: 1 });
    });

    it('handles "I want to buy" syntax without quantity', () => {
      const result = parseCommand('I want to buy bananas');
      expect(result).toEqual({ action: 'add', item: 'bananas', quantity: 1 });
    });

    it('handles add with quantity and unit noise words', () => {
      const result = parseCommand('add 2 bottles of water');
      expect(result).toEqual({ action: 'add', item: 'water', quantity: 2 });
    });

    it('handles buy with quantity without unit words', () => {
      const result = parseCommand('buy 5 oranges');
      expect(result).toEqual({ action: 'add', item: 'oranges', quantity: 5 });
    });
    
    it('handles "a/an" as quantity 1', () => {
      const result1 = parseCommand('add a loaf of bread');
      expect(result1).toEqual({ action: 'add', item: 'loaf of bread', quantity: 1 });
      
      const result2 = parseCommand('buy an apple');
      expect(result2).toEqual({ action: 'add', item: 'apple', quantity: 1 });
    });
  });

  describe('Remove Commands', () => {
    it('handles simple remove', () => {
      const result = parseCommand('remove milk');
      expect(result).toEqual({ action: 'remove', item: 'milk', quantity: null });
    });

    it('handles delete synonym', () => {
      const result = parseCommand('delete apples');
      expect(result).toEqual({ action: 'remove', item: 'apples', quantity: null });
    });
  });

  describe('Unknown / Fallback Commands (Triggers Phase 3)', () => {
    it('returns unknown for gibberish', () => {
      const result = parseCommand('what is the weather today');
      expect(result).toEqual({ action: 'unknown', item: null, quantity: null });
    });

    it('returns unknown for empty string', () => {
      const result = parseCommand('');
      expect(result).toEqual({ action: 'unknown', item: null, quantity: null });
    });

    it('returns unknown for just the intent word with no item', () => {
      const result = parseCommand('add');
      // Our regex requires at least some text (.+) after the intent word
      expect(result).toEqual({ action: 'unknown', item: null, quantity: null });
    });
  });
});
