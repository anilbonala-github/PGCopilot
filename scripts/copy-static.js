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

const indexPath = path.join(dist, 'index.html');
if (fs.existsSync(indexPath)) {
  const fallback = `
    <div id="pgcopilot-web-fallback" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;text-align:center;color:#17231F;background:#F6F6F1;min-height:100vh;box-sizing:border-box;">
      <h1 style="margin-top:30vh;font-size:24px;">Loading PGCopilot...</h1>
      <p style="color:#75827D;">If this stays here, please update Safari/iOS or refresh the page.</p>
    </div>
    <script>
      window.addEventListener('error', function(event) {
        var fallback = document.getElementById('pgcopilot-web-fallback');
        if (fallback) {
          fallback.innerHTML = '<h1 style="margin-top:28vh;font-size:22px;">PGCopilot could not open on this browser.</h1><p style="color:#75827D;">' + String(event.message || 'Unknown browser error') + '</p><p style="color:#75827D;">Please update Safari/iOS and reload.</p>';
        }
      });
      window.addEventListener('unhandledrejection', function(event) {
        var fallback = document.getElementById('pgcopilot-web-fallback');
        if (fallback) {
          fallback.innerHTML = '<h1 style="margin-top:28vh;font-size:22px;">PGCopilot could not open on this browser.</h1><p style="color:#75827D;">' + String((event.reason && event.reason.message) || event.reason || 'Unknown startup error') + '</p><p style="color:#75827D;">Please update Safari/iOS and reload.</p>';
        }
      });
      setTimeout(function() {
        var fallback = document.getElementById('pgcopilot-web-fallback');
        if (fallback && document.getElementById('root') && document.getElementById('root').childNodes.length > 0) {
          fallback.parentNode.removeChild(fallback);
        }
      }, 1200);
    </script>`;
  let html = fs.readFileSync(indexPath, 'utf8');
  if (!html.includes('pgcopilot-web-fallback')) {
    html = html.replace('<div id="root"></div>', `${fallback}\n    <div id="root"></div>`);
    fs.writeFileSync(indexPath, html);
    console.log('Injected web startup fallback.');
  }
}
