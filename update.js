const fs = require('fs');
let content = fs.readFileSync('api/parse.js', 'utf8');

const parts = content.split('  } catch (error) {');
if (parts.length === 2) {
  content = parts[0] + "  } catch (error) {\n    if (error.name === 'TimeoutError') {\n      return res.status(200).json({ action: 'unknown', item: null, quantity: null });\n    }\n    // Network errors or internal runtime errors\n    return res.status(500).json({ error: \\Server error: \\\\ });\n  }\n}\n";
  fs.writeFileSync('api/parse.js', content, 'utf8');
}
