// Quick fix script - manually fixes line 107
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'api', 'indices', 'route.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Fix the escape character issue on line 107
content = content.replace(
    /console\.error\(`\[Treasury\] \${item\.name} FAILED: value=\${yieldValue}`\); \\n\s+\/\/ Fallback/,
    'console.error(`[Treasury] ${item.name} FAILED: value=${yieldValue}`);\n                        // Fallback'
);

// Also ensure we check for undefined
content = content.replace(
    /if \(yieldValue !== null\) {/g,
    'if (yieldValue !== null && yieldValue !== undefined) {'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✅ Fixed syntax error in route.ts');
