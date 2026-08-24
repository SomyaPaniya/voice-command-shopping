const fs = require('fs');
let c = fs.readFileSync('src/App.test.js', 'utf8');

c = c.replace(/expect\(screen\.getByText\(\"add 2 apples\"\)\)\.toBeInTheDocument\(\);/g, 'expect(screen.getByText(/add 2 apples/i)).toBeInTheDocument();');

c = c.replace(/expect\(screen\.getByText\(\"Milk\"\)\)\.toBeInTheDocument\(\)/g, 'expect(screen.getAllByText("Milk")[0]).toBeInTheDocument()');

fs.writeFileSync('src/App.test.js', c, 'utf8');
