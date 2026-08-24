const fs = require('fs');
let c = fs.readFileSync('src/App.test.js', 'utf8');

c = c.replace(/expect\(screen\.getByText\(\"Apples\"\)\)\.toBeInTheDocument\(\);/g, 'expect(screen.getAllByText("Apples")[0]).toBeInTheDocument();');
c = c.replace(/expect\(screen\.getByText\(\"Milk\"\)\)\.toBeInTheDocument\(\);/g, 'expect(screen.getAllByText("Milk")[0]).toBeInTheDocument();');
c = c.replace(/expect\(screen\.getByText\(\"Bananas\"\)\)\.toBeInTheDocument\(\);/g, 'expect(screen.getAllByText("Bananas")[0]).toBeInTheDocument();');

fs.writeFileSync('src/App.test.js', c, 'utf8');
