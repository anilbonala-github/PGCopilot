const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');
const privacySource = path.join(root, 'pgcopilot-privacy-policy.html');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

if (fs.existsSync(privacySource)) {
  fs.copyFileSync(privacySource, path.join(dist, 'pgcopilot-privacy-policy.html'));
  fs.copyFileSync(privacySource, path.join(dist, 'privacy-policy.html'));
  console.log('Copied privacy policy pages to dist.');
}
