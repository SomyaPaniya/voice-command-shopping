const fs = require('fs');
let c = fs.readFileSync('src/App.test.js', 'utf8');

c = c.replace(/getByText\(" · "\)/g, 'getByText("1 · Dairy")');
c = c.replace(/💡 Smart Suggestions/g, '✨ Suggestions for you');

// Let's also check if "1 · Dairy" is actually getting matched, or what was the other one.
c = c.replace(/1 \· /g, '1 · ');

fs.writeFileSync('src/App.test.js', c, 'utf8');
