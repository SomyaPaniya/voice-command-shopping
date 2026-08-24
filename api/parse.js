module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text in request body' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.status(500).json({ error: 'Server configuration error: Gemini API key is missing' });
  }

  // We are using gemini-3.5-flash as the currently stable, standard model for fast text tasks
  const model = 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are a shopping assistant parser. 
Parse the following user request and extract the intent. The input may be in English or Hindi, but always return the output in English keys and values.
Return ONLY a raw JSON object with absolutely NO markdown formatting, NO code fences (\`\`\`), and NO explanation.

The exact shape of the JSON MUST be:
{
  "action": "add" | "remove" | "search" | "unknown",
  "item": string | null,
  "quantity": number | null,
  "brand": string | null,
  "maxPrice": number | null
}

If the user is asking to add or buy something, action is "add".
If the user is asking to remove or delete something, action is "remove".
If the user is asking to search, find, or look for something (e.g. "find Silk milk under 5 dollars"), action is "search".
For search, extract the brand if specified, and maxPrice if a maximum price or budget is specified.
If the phrase is gibberish, empty, or unrelated to shopping, action is "unknown".
Filter out unit words like "bottles of", "packs of", etc., from the item name. 
Default quantity to 1 if not specified.

User request to parse: "${text}"`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        // Set low temperature for strict factual output
        generationConfig: {
          temperature: 0.1,
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: `Gemini API error: ${response.status} - ${errorText}` });
    }

    const data = await response.json();
    
    // Extract the raw text from the Gemini response
    let rawOutput = '';
    try {
      rawOutput = data.candidates[0].content.parts[0].text;
    } catch (err) {
      return res.status(502).json({ error: 'Invalid response structure from Gemini API' });
    }

    // Strip markdown code fences if Gemini ignores the prompt instruction
    let cleanJsonStr = rawOutput.trim();
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.slice(7);
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.slice(3);
    }
    if (cleanJsonStr.endsWith('```')) {
      cleanJsonStr = cleanJsonStr.slice(0, -3);
    }
    cleanJsonStr = cleanJsonStr.trim();

    let parsed = null;
    try {
      parsed = JSON.parse(cleanJsonStr);
    } catch (err) {
      // If parsing fails completely (not valid JSON), return unknown rather than 500 error
      return res.status(200).json({ action: 'unknown', item: null, quantity: null });
    }

    // Validate the shape
    const validActions = ['add', 'remove', 'search', 'unknown'];
    if (
      !parsed || 
      typeof parsed !== 'object' ||
      !validActions.includes(parsed.action) ||
      (parsed.item !== null && typeof parsed.item !== 'string') ||
      (parsed.quantity !== null && typeof parsed.quantity !== 'number')
    ) {
      // Shape is invalid, return safe fallback format
      return res.status(200).json({ action: 'unknown', item: null, quantity: null });
    }

    // Return the successfully validated object
    return res.status(200).json({
      action: parsed.action,
      item: parsed.item,
      quantity: parsed.quantity,
      brand: parsed.brand || null,
      maxPrice: parsed.maxPrice || null
    });

  } catch (error) {
    if (error.name === 'TimeoutError') {
      return res.status(200).json({ action: 'unknown', item: null, quantity: null });
    }
    // Network errors or internal runtime errors
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
}
