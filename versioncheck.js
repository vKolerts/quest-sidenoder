const pkg = require('./package.json');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const compareVersions = require('compare-versions');
global.version = pkg.version;

async function checkVersion() {
  try {
    const res = await fetch('https://api.github.com/repos/vKolerts/sidenoder/releases/latest');
    const content = JSON.parse(await res.text())
    const remoteversion = content.name;

    console.log('Current version: ' + pkg.version);
    console.log('Github version: ' + remoteversion);
    if (!remoteversion) return;

    if (compareVersions.compare(remoteversion, pkg.version, '<=')) {
      console.log('Using latest version');
    }
    else {
      console.log('requires update');
      win.webContents.send('notify_update', {
        success: true,
        current: pkg.version,
        remote: remoteversion,
        url: content.html_url,
        description: content.body,
      });
    }
  }
  catch (err) {
    console.error('checkVersion.Fail', err);
  }
}