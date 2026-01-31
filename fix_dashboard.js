// Script to remove specific sections from Dashboard.js
const fs = require('fs');

const file = './src/views/Dashboard.js';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Remove lines 939-1274 (Whale Activity Heatmap, Risk Assessment, Market Momentum)
// Keep lines before 939 and after 1274
const before = lines.slice(0, 939);
const after = lines.slice(1274);

// Create new content
const newContent = [...before, ...after].join('\n');

fs.writeFileSync(file, newContent, 'utf8');
console.log('✅ Removed sections from Dashboard.js');
