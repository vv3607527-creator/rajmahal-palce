/* ==========================================================================
   Self-test for the local server:  node scripts\check-server.js [port]
   Checks /, a Range request on the hero video (scrub-friendly serving),
   and a poster image — then opens the site in the default browser.
   ========================================================================== */
'use strict';
const http = require('http');
const { exec } = require('child_process');
const port = Number(process.argv[2]) || 8000;

function get(path, headers) {
  return new Promise((resolve) => {
    const rq = http.get({ path: path, host: '127.0.0.1', port: port, headers: headers || {} }, (r) => {
      console.log(path, '-> HTTP', r.statusCode, r.headers['content-range'] || r.headers['content-type'] || '');
      r.resume();
      r.on('end', () => resolve(r.statusCode));
    });
    rq.on('error', (e) => { console.log(path, '-> DOWN:', e.message); resolve(0); });
    rq.setTimeout(3000, () => { console.log(path, '-> timeout'); rq.destroy(); resolve(0); });
  });
}

(async () => {
  const s = await get('/');
  if (s === 200) {
    await get('/assets/video/01-hero-aerial.mp4', { Range: 'bytes=0-1023' });
    await get('/assets/images/poster.jpg');
    exec('cmd /c start http://localhost:' + port);
    console.log('SERVER OK - browser opened at http://localhost:' + port);
  } else {
    console.log('SERVER NOT RESPONDING on port ' + port);
    process.exit(1);
  }
})();
