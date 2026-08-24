/**
 * Phase 2: Rule-Based Command Parser
 * 
 * This function takes a raw speech transcript and extracts the user's intent 
 * using a clearly defined list of regular expression patterns.
 * 
 * @param {string} text - The raw voice transcript.
 * @returns {object} - Parsed command object: { action, item, quantity }
 */
export function parseCommand(text) {

  const cleanItemName = (rawItem) => {
    return rawItem
      .replace(/\b(please|again|also|too|some more|add|buy)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  if (!text || typeof text !== 'string') {
    return { action: 'unknown', item: null, quantity: null };
  }

  // Normalize the input text: convert to lowercase and remove extra whitespace
  const normalizedText = text.toLowerCase().trim();
  const searchMatch = normalizedText.match(/^(search|find|look for)\\s+(.*)/i);
  if (searchMatch) {
    return {
      action: "search",
      item: cleanItemName(searchMatch[2]),
      quantity: 1,
      brand: null,
      maxPrice: null
    };
  }

  // List of readable rules/patterns to match against the transcript.
  // We evaluate them top-to-bottom. The first one that matches wins.
  const rules = [
    {
      // 1. Remove Pattern
      // Matches: "remove milk", "delete apples"
      // Regex explanation:
      // ^(?:remove|delete)\s+ -> Starts with remove or delete, followed by a space
      // (.+)$                 -> Captures the rest of the string as the item
      regex: /^(?:remove|delete)\s+(.+)$/,
      action: 'remove',
      extract: (match) => {
        return {
          item: cleanItemName(match[1]),
          quantity: null // Removals don't strictly need a quantity for our Phase 2 use-case
        };
      }
    },
    {
      // 2. Add Pattern (with optional quantity and unit words)
      // Matches: "add milk", "I need apples", "I want to buy bananas", 
      // "add 2 bottles of water", "buy 5 oranges"
      // Regex explanation:
      // ^(?:add|buy|i need|i want to buy)\s+ -> Starts with one of our intent phrases
      // (?:(\d+|a|an)\s+)?                   -> OPTIONAL: captures a number (or a/an) for quantity
      // (?:(?:bottles|cans|packs|boxes|bags|cartons)\s+of\s+)? -> OPTIONAL: ignores unit words (e.g. "bottles of")
      // (.+)$                                -> Captures the rest of the string as the item
      regex: /^(?:add|buy|i need|i want to buy)\s+(?:(\d+|a|an)\s+)?(?:(?:bottles|cans|packs|boxes|bags|cartons)\s+of\s+)?(.+)$/,
      action: 'add',
      extract: (match) => {
        let quantityRaw = match[1];
        let parsedQuantity = 1; // Default to 1 if no quantity is specified ("add milk")

        if (quantityRaw) {
          if (quantityRaw === 'a' || quantityRaw === 'an') {
            parsedQuantity = 1;
          } else {
            parsedQuantity = parseInt(quantityRaw, 10);
          }
        }

        return {
          item: cleanItemName(match[2]),
          quantity: parsedQuantity
        };
      }
    }
  ];

  // Loop through our rules and see if any apply
  for (const rule of rules) {
    const match = normalizedText.match(rule.regex);
    if (match) {
      const extractedData = rule.extract(match);
      return {
        action: rule.action,
        item: extractedData.item,
        quantity: extractedData.quantity
      };
    }
  }

  // Fallback: If no rules match, return 'unknown' cleanly.
  // This will be the trigger for Phase 3 (Gemini integration).
  return { action: 'unknown', item: null, quantity: null };
}
