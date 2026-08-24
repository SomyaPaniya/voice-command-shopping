const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

c = c.replace(/setFeedbackMessage\(Could not find \" \+ command\.item \+ \" in your shopping list\.\);/g, "setFeedbackMessage('Could not find \"' + command.item + '\" in your shopping list.');");

c = c.replace(/throw new Error\(API returned  \+ res\.status\);/g, "throw new Error('API returned ' + res.status);");

c = c.replace(/setError\(Speech recognition error:  \+ event\.error\);/g, "setError('Speech recognition error: ' + event.error);");

fs.writeFileSync('src/App.js', c, 'utf8');
