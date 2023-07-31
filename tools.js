const exec = require('child_process').exec;
// const fs = require('fs');
const fs = require('fs');
const fsp = fs.promises;
const util = require('util');
const path = require('path');
const crypto = require('crypto');
const commandExists = require('command-exists');

const ApkReader = require('adbkit-apkreader');
const adbkit = require('@devicefarmer/adbkit').default;
const adb = adbkit.createClient();
const fetch = require('node-fetch');
const WAE = require('web-auto-extractor').default
// const HttpProxyAgent = require('https-proxy-agent'); // TODO add https proxy support
const { SocksProxyAgent } = require('socks-proxy-agent');
const url = require('url');
// const ApkReader = require('node-apk-parser');

require('fix-path')();
// adb.kill();

const pkg = require('./package.json');
const _sec = 1000;
const _min = 60 * _sec;

CHECK_META_PERIOD = 2 * _min;
const l = 32;
const configLocationOld = path.join(global.homedir, 'sidenoder-config.json');
const configLocation = path.join(global.sidenoderHome, 'config.json');

let agentOculus,
  agentSteam,
  agentSQ;

init();

const GAME_LIST_NAMES = global.currentConfiguration.gameListNames || [
  'FFA.txt',
  'GameList.txt',
  'VRP-GameList.txt/VRP-GameList.txt',
  'VRP-GameList.txt',
  'Dynamic.txt',
];
let META_VERSION = [];
let QUEST_ICONS = [];
let cacheOculusGames = false;
let KMETAS = {};
let KMETAS2 = {};

let adbCmd = 'adb';
let grep_cmd = '| grep ';
if (platform == 'win') {
  grep_cmd = '| findstr ';
}

let RCLONE_ID = 0;


module.exports =
{
//properties
  resetCache,
//methods
  getDeviceSync,
  trackDevices,
  checkDeps,
  checkMount,
  mount,
  killRClone,
  getDir,
  returnError,
  sideloadFolder,
  getInstalledApps,
  getInstalledAppsWithUpdates,
  getApkFromFolder,
  uninstall,
  getDirListing,
  getPackageInfo,
  wifiGetStat,
  wifiEnable,
  connectWireless,
  disconnectWireless,
  enableMTP,
  startSCRCPY,
  rebootDevice,
  rebootRecovery,
  rebootBootloader,
  sideloadFile,
  getLaunchActiviy,
  getActivities,
  startActivity,
  devOpenUrl,
  checkAppTools,
  changeAppConfig,
  backupApp,
  backupAppData,
  restoreAppData,
  getDeviceInfo,
  getStorageInfo,
  getUserInfo,
  getFwInfo,
  getBatteryInfo,
  changeConfig,
  reloadConfig,
  execShellCommand,
  updateRcloneProgress,
  deviceTweaksGet,
  deviceTweaksSet,
  appInfo,
  appInfoEvents,
  isIdle,
  wakeUp,
  detectInstallTxt,
  detectNoteTxt,
  // ...
}

async function getDeviceInfo() {
  if (!global.adbDevice) {
    return {
      success: false,
    };
  }
  // console.log('getDeviceInfo()');

  const storage = await getStorageInfo();
  const user = await getUserInfo();
  const fw = await getFwInfo();
  const battery = await getBatteryInfo();
  const ip = await getDeviceIp();
  const wifi = await wifiGetStat();

  const res = {
    success: !!storage,
    storage,
    user,
    fw,
    battery,
    ip,
    wifi,
  };

  // console.log('getDeviceInfo', res);
  return res;
}

async function getFwInfo() {
  console.log('getFwInfo()');
  const res = await adbShell('getprop ro.build.branch');
  if (!res) return false;

  return {
    version: res.replace('releases-oculus-', ''),
  }
}

async function getBatteryInfo() {
  console.log('getBatteryInfo()');
  const res = await adbShell('dumpsys battery');
  if (!res) return false;

  return parceOutOptions(res);
}

async function getUserInfo() {
  if (global.currentConfiguration.userHide) return {
    name: '<i>hidden</i>'
  };

  console.log('getUserInfo()');
  const res = await adbShell('dumpsys user | grep UserInfo');
  if (!res) return false;

  return {
    name: res.split(':')[1],
  }
}

async function deviceTweaksGet(arg) {
  console.log('deviceTweaksGet()', arg);
  let res = {
    cmd: 'get',
    // mp_name: '',
    // guardian_pause: '0',
    // frc: '0',
    // gRR: '72',
    // gCA: '-1',
    // gFFR: '2',
    // CPU: '2',
    // GPU: '2',
    // vres: '1024',
    // cres: '640x480',
    // gSSO: '1440x1584',
  };

  if (arg.key == 'mp_name') res.mp_name = (await adbShell('settings get global username'));
  if (arg.key == 'guardian_pause') res.guardian_pause = (await adbShell('getprop debug.oculus.guardian_pause'));
  if (arg.key == 'frc') res.frc = (await adbShell('getprop debug.oculus.fullRateCapture'));
  if (arg.key == 'gRR') res.gRR = (await adbShell('getprop debug.oculus.refreshRate'));
  if (arg.key == 'gCA') res.gCA = (await adbShell('getprop debug.oculus.forceChroma'));
  if (arg.key == 'gFFR') res.gFFR = (await adbShell('getprop debug.oculus.foveation.level'));
  if (arg.key == 'CPU') res.CPU = (await adbShell('getprop debug.oculus.cpuLevel'));
  if (arg.key == 'GPU') res.GPU = (await adbShell('getprop debug.oculus.gpuLevel'));
  if (arg.key == 'vres') res.vres = (await adbShell('getprop debug.oculus.videoResolution'));
  if (arg.key == 'cres') res.cres = (await adbShell('getprop debug.oculus.capture.width')) + 'x' + (await adbShell('getprop debug.oculus.capture.height'));
  if (arg.key == 'gSSO') res.gSSO = (await adbShell('getprop debug.oculus.textureWidth')) + 'x' + (await adbShell('getprop debug.oculus.textureHeight'));
  //oculus.capture.bitrate

  return res;
}

async function deviceTweaksSet(arg) {
  console.log('deviceTweaksSet()', arg);
  let res = {cmd: 'set'};
  if (typeof arg.mp_name != 'undefined') {
    res.mp_name = await adbShell('settings put global username ' + arg.mp_name);
  }

  if (typeof arg.guardian_pause != 'undefined') {
    res.guardian_pause = await adbShell('setprop debug.oculus.guardian_pause ' + (arg.guardian_pause ? '1' : '0'));
  }
  if (typeof arg.frc != 'undefined') {
    res.frc = await adbShell('setprop debug.oculus.fullRateCapture ' + (arg.frc ? '1' : '0'));
  }

  if (typeof arg.gRR != 'undefined') {
    res.gRR = await adbShell('setprop debug.oculus.refreshRate ' + arg.gRR);
  }

  if (typeof arg.gCA != 'undefined') {
    res.gCA = await adbShell('setprop debug.oculus.forceChroma ' + arg.gCA);
  }

  if (typeof arg.gFFR != 'undefined') {
    res.gFFR = await adbShell('setprop debug.oculus.foveation.level ' + arg.gFFR);
  }

  if (typeof arg.CPU != 'undefined') {
    res.CPU = await adbShell('setprop debug.oculus.cpuLevel ' + arg.CPU);
  }

  if (typeof arg.GPU != 'undefined') {
    res.GPU = await adbShell('setprop debug.oculus.gpuLevel ' + arg.GPU);
  }

  if (typeof arg.vres != 'undefined') {
    res.vres = await adbShell('setprop debug.oculus.videoResolution ' + arg.vres);
  }

  if (typeof arg.cres != 'undefined') {
    const [width, height] = arg.cres.split('x');
    await adbShell('setprop debug.oculus.capture.width ' + width);
    res.cres = await adbShell('setprop debug.oculus.capture.height ' + height);
  }

  if (typeof arg.gSSO != 'undefined') {
    const [width, height] = arg.gSSO.split('x');
    await adbShell('setprop debug.oculus.textureWidth ' + width);
    await adbShell('setprop debug.oculus.textureHeight ' + height);
    res.gSSO = await adbShell('settings put system font_scale 0.85 && settings put system font_scale 1.0');
  }

  return res;
}

async function getStorageInfo() {
  console.log('getStorageInfo()');

  const linematch = await adbShell('df -h | grep "/storage/emulated"');
  if (!linematch) return false;

  const refree = new RegExp('([0-9(.{1})]+[a-zA-Z%])', 'g');
  const storage = linematch.match(refree);
  console.log(storage)

  if (storage.length == 3) {
    return {
      size: storage[0],
      used: storage[1],
      free: 0,
      percent: storage[2],
    };
  }

  return {
    size: storage[0],
    used: storage[1],
    free: storage[2],
    percent: storage[3],
  };
}

async function getLaunchActiviy(package) {
  console.log('startApp()', package);
  const activity = await adbShell(`dumpsys package ${package} | grep -A 1 'filter' | head -n 1 | cut -d ' ' -f 10`);
  return startActivity(activity);
}

async function getActivities(package, activity = false) {
  console.log('getActivities()', package);

  let activities = await adbShell(`dumpsys package | grep -Eo '^[[:space:]]+[0-9a-f]+[[:space:]]+${package}/[^[:space:]]+' | grep -oE '[^[:space:]]+$'`);
  if (!activities) return false;

  activities = activities.split('\n');
  // activities.pop();
  console.log({ package, activities });
  // TODO: check manifest.application.launcherActivities

  return activities;
}

async function startActivity(activity) {
  console.log('startActivity()', activity);
  wakeUp();
  const result = await adbShell(`am start ${activity}`); // TODO activity selection

  console.log('startActivity', activity, result);
  return result;
}

async function devOpenUrl(url) {
  console.log('devOpenUrl', url);
  wakeUp();
  const result = await adbShell(`am start -a android.intent.action.VIEW -d "${url}"`); // TODO activity selection

  console.log('devOpenUrl', url, result);
  return result;
}

async function readAppCfg(package) {
  let config = await adbShell(`cat /sdcard/Android/data/${package}/private/config.json 1>&1 2> /dev/null`);
  try {
    config = config && JSON.parse(config);
  }
  catch (e) {
    console.error('readAppCfg', e);
    config = false;
  }

  return config;
}

async function checkAppTools(package) {
  const backupPath = path.join(global.sidenoderHome, 'backup_data', package);
  const availableBackup = await adbFileExists(`/sdcard/Android/data/${package}`);
  let availableRestore = false;
  let availableConfig = false;
  if (await fsp.exists(backupPath)) {
    try {
      availableRestore = await fsp.readFile(`${backupPath}/time.txt`, 'utf8');
    }
    catch (err) {
      availableRestore = 1;
    }
  }

  if (availableBackup) {
    availableConfig = await readAppCfg(package);
  }

  return {
    success: true,
    package,
    availableRestore,
    availableConfig,
  };
}

async function changeAppConfig(package, key, val) {
  console.log('changeAppConfig()', { package, key, val });
  const res = {
    package,
    key,
    val,
    success: false,
  };

  let config = await readAppCfg(package);
  try {
    config = Object.assign(config, { [key]: val });
    adbShell(`echo '${JSON.stringify(config)}' > "/sdcard/Android/data/${package}/private/config.json"`);
    config = await readAppCfg(package);
    res.val = config && config[key];
    res.success = !!config;
  }
  catch(e) {
    console.error('changeAppConfig', res, e);
  }

  return res;
}

// Implementation ----------------------------------

async function getDeviceIp() {
  // let ip = await adb.getDHCPIpAddress(global.adbDevice);
  // if (ip) return ip;
  if (!global.adbDevice && global.currentConfiguration.lastIp) {
    return global.currentConfiguration.lastIp;
  }

  let ip = await adbShell(`ip -o route get to 8.8.8.8 | sed -n 's/.*src \\([0-9.]\\+\\).*/\\1/p'`);
  console.log({ip});
  if (ip) return ip;

  ip = await adbShell(`ip addr show wlan0  | grep 'inet ' | cut -d ' ' -f 6 | cut -d / -f 1`);
  console.log({ip});
  if (ip) return ip;
  return false;
}

async function wifiGetStat() {
  const on = await adbShell('settings get global wifi_on');
  return on && +on;
}

async function wifiEnable(enable) {
  return adbShell(`svc wifi ${enable ? 'enable' : 'disable'}`);
}

async function connectWireless() {
  const on = await adbShell('settings get global wifi_on');
  if (!(await wifiGetStat())) {
    console.error('connectWireless', 'wifi disabled');
    await wifiEnable(true);
    return false;
  }

  // await adbShell(`setprop service.adb.tcp.port 5555`);
  // TODO: save ip & try use it
  const ip = await getDeviceIp();
  console.log({ ip });
  if (!ip) return false;

  try {
    if (global.adbDevice) {
      const device = adb.getDevice(global.adbDevice);
      const port = await device.tcpip();
      await device.waitForDevice();
      console.log('set tcpip', port);
      await changeConfig('lastIp', ip);
    }

    const deviceTCP = await adb.connect(ip, 5555);
    // await deviceTCP.waitForDevice();
    console.log('connectWireless', { ip, res: deviceTCP });

    return ip;
  }
  catch (err) {
    console.error('connectWireless', err);
    await changeConfig('lastIp', '');
    return false;
  }
}

async function disconnectWireless() {
  const ip = await getDeviceIp();
  if (!ip) return false;

  try {
    const res = await adb.disconnect(ip, 5555);
    // const res = await adb.usb(global.adbDevice);
    console.log('disconnectWireless', { ip, res });
    // await changeConfig('lastIp', '');
    // await getDeviceSync();
    return res;
  }
  catch (err) {
    console.error('disconnectWireless.error', err);
    return !(await isWireless());
  }
}

async function isWireless() {
  try {
    const devices = await adb.listDevices();
    for (const device of devices) {
      if (!device.id.includes(':5555')) continue;
      if (['offline', 'authorizing'].includes(device.type)) continue;
      if (['unauthorized'].includes(device.type)) {
        win.webContents.send('alert', 'Please authorize adb access on your device');
        continue;
      }

      console.log('device.id', device.type);
      return device.id;
    }

    return false;
  }
  catch (err) {
    console.error('Something went wrong:', err.stack);
    return false;
  }
}

async function enableMTP() {
  const res = await adbShell(`svc usb setFunctions mtp`);
  console.log('enableMTP', { res });
  return res;
}

async function isIdle() {
  const res = await adbShell(`dumpsys deviceidle | grep mScreenOn`);
  console.log(res, res.includes('true'));
  return !res.includes('true');
}

async function wakeUp() {
  if (!(await isIdle())) return;
  return adbShell(`input keyevent KEYCODE_POWER`);
}

async function startSCRCPY() {
  console.log('startSCRCPY()');
  if (!global.currentConfiguration.scrcpyPath && !(await commandExists('scrcpy'))) {
    returnError('Can`t find scrcpy binary');
    return;
  }

  const scrcpyCmd = `"${global.currentConfiguration.scrcpyPath || 'scrcpy'}" ` +
    (global.currentConfiguration.scrcpyCrop ? `--crop ${global.currentConfiguration.scrcpyCrop} `: '') +
    `-b ${global.currentConfiguration.scrcpyBitrate || 1}M ` +
    (global.currentConfiguration.scrcpyFps ? `--max-fps ${global.currentConfiguration.scrcpyFps} ` : '') +
    (global.currentConfiguration.scrcpySize ? `--max-size ${global.currentConfiguration.scrcpySize} ` : '') +
    (!global.currentConfiguration.scrcpyWindow ? '-f ' : '') +
    (global.currentConfiguration.scrcpyOnTop ? '--always-on-top ' : '') +
    (!global.currentConfiguration.scrcpyControl ? '-n ' : '') +
    '--window-title "SideNoder Stream" ' +
    `-s ${global.adbDevice} `;
  console.log({ scrcpyCmd });
  wakeUp();
  exec(scrcpyCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('scrcpy error:', error);
      win.webContents.send('cmd_sended', { success: error });
      return;
    }

    if (stderr) {
      console.error('scrcpy stderr:', stderr);
      // win.webContents.send('cmd_sended', { success: stderr });
      return;
    }

    console.log('scrcpy stdout:', stdout);
  });

  return scrcpyCmd;
}

async function rebootDevice() {
  const res = await adbShell(`reboot`);
  console.log('rebootDevice', { res });
  return res;
}
async function rebootRecovery() {
  const res = await adbShell(`reboot recovery`);
  console.log('rebootRecovery', { res });
  return res;
}
async function rebootBootloader() {
  const res = await adbShell(`reboot bootloader`);
  console.log('rebootBootloader', { res });
  return res;
}
async function sideloadFile(path) {
  const res = await execShellCommand(`"${adbCmd}" sideload "${path}"`);
  console.log('sideloadFile', { res });
  return res;
}

async function getDeviceSync(attempt = 0) {
  try {
    // const lastDevice = global.adbDevice;
    const devices = await adb.listDevices();
    console.log({ devices });
    global.adbDevice = false;
    for (const device of devices) {
      if (['offline', 'authorizing'].includes(device.type)) continue;
      if (['unauthorized'].includes(device.type)) {
        win.webContents.send('alert', 'Please authorize adb access on your device');
        continue;
      }

      if (
        !global.currentConfiguration.allowOtherDevices
        && await adbShell('getprop ro.product.brand', device.id) != 'oculus'
      ) continue;

      global.adbDevice = device.id;
    }


    /*if (!global.adbDevice && devices.length > 0 && attempt < 1) {
      return setTimeout(()=> getDeviceSync(attempt + 1), 1000);
    }*/
    // if (lastDevice == global.adbDevice) return;

    win.webContents.send('check_device', { success: global.adbDevice });

    return global.adbDevice;
  }
  catch (err) {
    console.error('Something went wrong:', err.stack);
  }
}


/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
async function adbShell(cmd, deviceId = global.adbDevice, skipRead = false) {
  try {
    if (!deviceId) {
      throw 'device not defined';
    }

    global.adbError = null;
    const r = await adb.getDevice(deviceId).shell(cmd);
    // console.timeLog(cmd);
    if (skipRead) {
      console.log(`adbShell[${deviceId}]`, { cmd, skipRead });
      return true;
    }

    let output = await adbkit.util.readAll(r);
    output = await output.toString();
    // output = output.split('\n');
    // const end = output.pop();
    // if (end != '') output.push();
    console.log(`adbShell[${deviceId}]`, { cmd, output });
    if (output.substr(-1) == '\n') return output.slice(0, -1);
    return output;
  }
  catch (err) {
    console.error(`adbShell[${deviceId}]: err`, {cmd}, err);
    global.adbError = err;
    if (err.toString() == `FailError: Failure: 'device offline'`) {
      getDeviceSync();
    }

    return false;
  }
}

function parceOutOptions(line) {
  let opts = {};
  for (let l of line.split('\n')) {
    l = l.split(' ').join('');
    let [k, v] = l.split(':');

    if (v == 'true') v = true;
    if (v == 'false') v = false;
    if (!isNaN(+v)) v = +v;

    opts[k] = v;
  }

  return opts;
}

// on empty dirrectory return false
async function adbFileExists(path) {
  const r = await adbShell(`ls "${path}" 1>&1 2> /dev/null`);
  return r;
}

async function adbPull(orig, dest, sync = false) {
  console.log('adbPull', orig, dest);
  const transfer = sync
    ? await sync.pull(orig)
    : await adb.getDevice(global.adbDevice).pull(orig);
  return new Promise(function(resolve, reject) {
    let c = 0;
    transfer.on('progress', (stats) => {
      c++;
      if (c % 40 != 1) return; // skip 20 events

      // console.log(orig + ' pulled', stats);
      const res = {
        cmd: 'pull',
        bytes: stats.bytesTransferred,
        size: 0,
        percentage: 0,
        speedAvg: 0,
        eta: 0,
        name: orig,
      }
      win.webContents.send('process_data', res);
    });
    transfer.on('end', () => {
      console.log(orig, 'pull complete');
      win.webContents.send('process_data', false);
      resolve(true);
    });
    transfer.on('error', (err) => {
      console.error('adb_pull_stderr', err);
      win.webContents.send('process_data', false);
      reject(err);
    });
    transfer.pipe(fs.createWriteStream(dest));
  });
}

async function adbPullFolder(orig, dest, sync = false) {
  console.log('pullFolder', orig, dest);
  /*let need_close = false;
  if (!sync) {
    need_close = true;
    sync = await adb.getDevice(global.adbDevice).syncService();
  }*/

  let actions = [];
  await fsp.mkdir(dest, { recursive: true });
  const files = sync
    ? await sync.readdir(orig)
    : await adb.getDevice(global.adbDevice).readdir(orig);

  for (const file of files) {
    const new_orig = `${orig}/${file.name}`;
    const new_dest = path.join(dest, file.name);
    if (file.isFile()) {
      actions.push(adbPull(new_orig, new_dest, sync)); // file.size
      continue;
    }

    actions.push(adbPullFolder(new_orig, new_dest, sync));
  }

  await Promise.all(actions);

  // if (need_close) sync.end();

  return true;
}

async function adbPush(orig, dest, sync = false) {
  console.log('adbPush', orig, dest);
  const transfer = sync
    ? await sync.pushFile(orig, dest)
    : await adb.getDevice(global.adbDevice).push(orig, dest);
  const stats = await fsp.lstat(orig);
  const size = stats.size;

  return new Promise(function(resolve, reject) {
    let c = 0
    transfer.on('progress', (stats) => {
      c++;
      if (c % 40 != 1) return; // skip 20 events

      // console.log(orig + ' pushed', stats);
      const res = {
        cmd: 'push',
        bytes: stats.bytesTransferred,
        size,
        percentage: (stats.bytesTransferred * 100 / size).toFixed(2),
        speedAvg: 0,
        eta: 0,
        name: orig,
      }
      win.webContents.send('process_data', res);
    });
    transfer.on('end', () => {
      console.log(orig, 'push complete');
      win.webContents.send('process_data', false);
      resolve(true);
    });
    transfer.on('error', (err) => {
      console.error('adb_push_stderr', err);
      win.webContents.send('process_data', false);
      reject(err);
    });
  });
}

async function adbPushFolder(orig, dest, sync = false) {
  console.log('pushFolder', orig, dest);

  const stat = await fsp.lstat(orig);
  console.log({ orig, stat }, stat.isFile());
  if (stat.isFile()) return adbPush(orig, dest);

  /*let need_close = false;
  if (!sync) {
    need_close = true;
    sync = await adb.getDevice(global.adbDevice).syncService();
  }*/

  let actions = [];
  await adbShell(`mkdir -p ${dest}`, global.adbDevice, true);
  const files = await fsp.readdir(orig, { withFileTypes: true });
  for (const file of files) {
    const new_orig = path.join(orig, file.name);
    const new_dest = `${dest}/${file.name}`;
    if (file.isFile()) {
      actions.push(adbPush(new_orig, new_dest, sync));
      continue;
    }

    actions.push(adbPushFolder(new_orig, new_dest, sync));
  }

  await Promise.all(actions);

  // if (need_close) sync.end();

  return true;
}

async function adbInstall(apk) {
  console.log('adbInstall', apk);
  const temp_path = '/data/local/tmp/install.apk';

  await adbPush(apk, temp_path);
  try {
    await adb.getDevice(global.adbDevice).installRemote(temp_path);
  }
  catch (err) {
    adbShell(`rm ${temp_path}`);
    throw err;
  }

  return true;
}

function execShellCommand(cmd, ignoreError = false, buffer = 100) {
  console.log({cmd});
  return new Promise((resolve, reject) => {
    exec(cmd,  {maxBuffer: 1024 * buffer}, (error, stdout, stderr) => {
      if (error) {
        if (ignoreError) return resolve(false);
        console.error('exec_error', cmd, error);
        return reject(error);
      }

      if (stdout || !stderr) {
        console.log('exec_stdout', cmd, stdout);
        return resolve(stdout);
      }
      else {
        if (ignoreError) return resolve(false);
        console.error('exec_stderr', cmd, stderr);
        return reject(stderr);
      }
    });
  });
}


async function trackDevices() {
  console.log('trackDevices()');
  await getDeviceSync();

  try {
    const tracker = await adb.trackDevices()
    tracker.on('add', async (device) => {
      console.log('Device was plugged in', device.id);
      // await getDeviceSync();
    });

    tracker.on('remove', async (device) => {
      console.log('Device was unplugged', device.id);
      // await getDeviceSync();
    });

    tracker.on('change', async (device) => { // TODO: // need fix double run
      console.log('Device was changed', device.id);
      await getDeviceSync();
    });

    tracker.on('end', () => {
      console.error('Tracking stopped');
      trackDevices();
    });
  }
  catch (err) {
    console.error('Something went wrong:', err.stack);
    returnError(err);
  }
}

async function appInfo(args) {
  const { res, package } = args;
  const app = KMETAS[package];
  let data = {
    res,
    package,
    id: 0,
    name: app.simpleName,
    short_description: '',
    detailed_description: '',
    about_the_game: '',
    supported_languages: '',
    genres: [],
    header_image: '',
    screenshots: [],
    url: '',
  };

  try {
    if (res == 'steam') {
      const steam = app && app.steam;
      if (!steam || !steam.id) throw 'incorrect args';

      data.id = steam.id;
      data.url = `https://store.steampowered.com/app/${data.id}/`;

      const resp = await fetchTimeout(`https://store.steampowered.com/api/appdetails?appids=${data.id}`, {
        headers: { 'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3' },
        agent: agentSteam,
      });
      const json = await resp.json();
      // console.log({ json });

      Object.assign(data, json[data.id].data);
    }

    if (res == 'oculus') {
      const oculus = app && app.oculus;
      if (!oculus || !oculus.id) throw 'incorrect args';
      // console.log({ oculus });

      data.id = oculus.id;
      data.url = `https://www.oculus.com/experiences/quest/${data.id}`;
      // data.genres = oculus.genres && oculus.genres.split(', ');

      //https://computerelite.github.io
      let resp = await fetchTimeout(`https://graph.oculus.com/graphql?forced_locale=${global.locale}`, {
        method: 'POST',
        body: `access_token=OC|1317831034909742|&variables={"itemId":"${oculus.id}","first":1}&doc_id=5373392672732392`,
        headers: {
          'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://www.oculus.com',
        },
        agent: agentOculus,
      });
      try {
        let json = await resp.json();
        // console.log('json', json);
        if (json.error) throw json.error;

        const meta = json.data.node;
        if (!meta) throw 'empty json.data.node';

        data.name = meta.appName;
        data.detailed_description = meta.display_long_description && meta.display_long_description.split('\n').join('<br/>');
        data.genres = meta.genre_names;

        if (meta.supported_in_app_languages) {
          data.supported_languages = meta.supported_in_app_languages.map(({name}) => name).join(', ');
        }
        //meta.internet_connection_name,
        //meta.quality_rating_aggregate,
        //meta.release_date,

        if (meta.website_page_meta) {
          data.header_image = meta.website_page_meta.image_url;
          data.short_description = meta.website_page_meta.description && meta.website_page_meta.description.split('\n').join('<br/>');
          data.url = meta.website_page_meta.page_url;
        }

        if (meta.screenshots) {
          for (const { uri } of meta.screenshots) {
            data.screenshots.push({
              // id,
              path_thumbnail: uri,
            });
          }
        }

        if (meta.trailer && meta.trailer.uri) {
          data.movies = [{ mp4: { '480': meta.trailer.uri } }];
        }
      }
      catch(err) {
        console.error(res, 'fetch error', err);

        resp = await fetchTimeout(`${data.url}?locale=${global.locale}`, {
          agent: agentOculus,
        });
        const meta = await WAE().parse(await resp.text());
        const { metatags } = meta;
        // console.log('meta', meta);

        data.name = metatags['og:title'][0].replace(' on Oculus Quest', '');
        data.header_image = metatags['og:image'][0];
        data.short_description = metatags['og:description'][0] && metatags['og:description'][0].split('\n').join('<br/>');
        data.url = metatags['al:web:url'][0];

        const jsonld = meta.jsonld.Product && meta.jsonld.Product[0] || JSON.parse(metatags['json-ld'][0]);
        // console.log(jsonld);

        if (jsonld) {
          if (jsonld.name) data.name = jsonld.name;
          data.detailed_description = jsonld.description && jsonld.description.split('\n').join('<br/>');

          if (jsonld.image) {
            for (const id in jsonld.image) {
              if (['0', '1', '2'].includes(id)) continue; // skip resizes of header

              data.screenshots.push({
                id,
                path_thumbnail: jsonld.image[id],
              });
            }
          }
        }
      }
    }

    if (res == 'sq') {
      const sq = app && app.sq;
      if (!sq || !sq.id) throw 'incorrect args';
      // console.log({ sq });

      data.id = sq.id;
      data.url = `https://sidequestvr.com/app/${data.id}/`;

      const resp = await fetchTimeout(`https://api.sidequestvr.com/get-app`, {
        method: 'POST',
        body: JSON.stringify({ apps_id: data.id }),
        headers: {
          'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3',
          'Content-Type': 'application/json',
          'Origin': 'https://sidequestvr.com',
          'Cookie': ' __stripe_mid=829427af-c8dd-47d1-a857-1dc73c95b947201218; cf_clearance=LkOSetFAXEs255r2rAMVK_hm_I0lawkUfJAedj1nkD0-1633288577-0-250; __stripe_sid=6e94bd6b-19a4-4c34-98d5-1dc46423dd2e2f3688',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:92.0) Gecko/20100101 Firefox/92.0',
        },
        agent: agentSQ,
      });
      const json = await resp.json();
      const meta = json.data[0];
      data.name = meta.name;
      data.header_image = meta.image_url;
      data.short_description = meta.summary;
      data.detailed_description = meta.description.split('\n').join('<br/>');
      if (meta.video_url)
        data.youtube = [meta.video_url
          .replace('youtube.com', 'youtube.com/embed')
          .replace('youtu.be', 'youtube.com/embed')
          .replace('/embed/embed', '/embed')
          .replace('/watch?v=', '/')
        ];

      const resp_img = await fetchTimeout(`https://api.sidequestvr.com/get-app-screenshots`, {
        method: 'POST',
        body: JSON.stringify({ apps_id: data.id }),
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://sidequestvr.com',
          'Cookie': ' __stripe_mid=829427af-c8dd-47d1-a857-1dc73c95b947201218; cf_clearance=LkOSetFAXEs255r2rAMVK_hm_I0lawkUfJAedj1nkD0-1633288577-0-250; __stripe_sid=6e94bd6b-19a4-4c34-98d5-1dc46423dd2e2f3688',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:92.0) Gecko/20100101 Firefox/92.0',

        },
        agent: agentSQ,
      });
      const json_img = await resp_img.json();
      for (const id in json_img.data) {
        data.screenshots.push({
          id,
          path_thumbnail: json_img.data[id].image_url,
        });
      }
    }
  }
  catch (err) {
    console.error('appInfo', { args, data }, err);
  }

  return { success: true, data };
}

async function appInfoEvents(args) {
  const { res, package } = args;
  const app = KMETAS[package];
  let data = {
    res,
    package,
    events: [],
  };

  try {
    if (res == 'steam') {
      const steam = app && app.steam;
      if (!steam || !steam.id) throw 'incorrect args';

      data.url = `https://store.steampowered.com/news/app/${steam.id}/`;

      const resp = await fetchTimeout(`http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002?appid=${steam.id}`, {
        headers: { 'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3' },
        agent: agentSteam,
      });
      const json = await resp.json();
      // console.log({ json });

      const events = json.appnews.newsitems;
      for (const e of events) {
        const event = {
          title: e.title,
          url: e.url,
          date: (new Date(e.date * _sec)).toLocaleString(),
          // author: e.author,
        }

        event.contents = e.contents
          .split('\n').join('<br/>')
          .split('[img]').join('<center><img src="')
          .split('[/img]').join('" /></center>')
          .split('{STEAM_CLAN_IMAGE}').join('https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/clans')
          .split('[list]').join('<ul>')
          .split('[/list]').join('</ul>')
          .split('[*]').join('</li><li>')
          // .split('[b]').join('<b>')
          // .split('[/b]').join('</b>')
          // .split('[i]').join('<i>')
          // .split('[/i]').join('</i>')
          .split('[').join('<')
          .split(']').join('>')
        data.events.push(event);
      }
    }

    if (res == 'oculus') {
      const oculus = app && app.oculus;
      if (!oculus || !oculus.id) throw 'incorrect args';

      // data.url = `https://store.steampowered.com/news/app/${steam.id}/`;

      let resp = await fetchTimeout(`https://graph.oculus.com/graphql?forced_locale=${global.locale}`, {
        method: 'POST',
        body: `access_token=OC|1317831034909742|&variables={"id":"${oculus.id}"}&doc_id=1586217024733717`,
        headers: {
          'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://www.oculus.com',
        },
        agent: agentOculus,
      });
      try {
        let json = await resp.json();
        if (json.error) throw json.error;

        // console.log({ json });
        const events = json.data.node.supportedBinaries.edges;
        for (const { node } of events) {
          const e = node;
          const event = {
            id: e.id,
            title: `${e.version} (versionCode: ${e.versionCode})`,
            contents: e.changeLog && e.changeLog.split('\n').join('<br/>'),
            // richChangeLog: e.richChangeLog,
            // url: '',
            // date: '',
            // author: '',
          };

          if (e.richChangeLog) console.log('RICHCHANGELOG', e.richChangeLog);

          data.events.push(event);
        }
      }
      catch (err) {
        console.error(res, 'fetch error', err);
      }

      resp = await fetch(`https://computerelite.github.io/tools/Oculus/OlderAppVersions/${oculus.id}.json`);
      json = await resp.json();
      // console.log({ json });
      const events = json.data.node.binaries.edges;
      for (const { node } of events) {
        const e = node;
        let found = false;
        for (const i in data.events) {
          if (data.events[i].id != e.id) continue;

          data.events[i].date = (new Date(e.created_date * _sec)).toLocaleString();
          found = true;
          break;
        }
        if (found) continue;

        const event = {
          id: e.id,
          title: `${e.version} (versionCode: ${e.version_code})`,
          date: (new Date(e.created_date * _sec)).toLocaleString(),
          contents: e.change_log.split('\n').join('<br/>'),
          // url: '',
          // author: '',
        };

        data.events.push(event);
      }
    }

    if (res == 'sq') {
      const sq = app && app.sq;
      if (!sq || !sq.id) throw 'incorrect args';
      // console.log({ sq });

      for (const is_news of [true, false]) {
        const resp = await fetchTimeout(`https://api.sidequestvr.com/events-list`, {
          method: 'POST',
          body: JSON.stringify({ apps_id: sq.id, is_news }),
          headers: {
            'Accept-Language': global.locale + ',ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Content-Type': 'application/json',
            'Origin': 'https://sidequestvr.com',
            'Cookie': ' __stripe_mid=829427af-c8dd-47d1-a857-1dc73c95b947201218; cf_clearance=LkOSetFAXEs255r2rAMVK_hm_I0lawkUfJAedj1nkD0-1633288577-0-250; __stripe_sid=6e94bd6b-19a4-4c34-98d5-1dc46423dd2e2f3688',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:92.0) Gecko/20100101 Firefox/92.0',
          },
          agent: agentSQ,
        });
        const json = await resp.json();
        // console.log({ json });
        for (const e of json.data) {
          const event = {
            id: e.events_id,
            title: e.event_name,
            url: e.event_url,
            date: (new Date(e.start_time * _sec)).toLocaleString(),
            contents: '',
            // author: '',
          };

          if (e.event_image) {
            event.contents += `<center><img src="${e.event_image[0] == '/' ? 'https://sidequestvr.com':''}${e.event_image}" /></center>`;
          }

          if (e.event_description) {
            event.contents += e.event_description.split('\n').join('<br/>');
          }

          data.events.push(event);
        }
      }

    }
  }
  catch (err) {
    console.error('appInfoEvents', { args, data }, err);
  }

  return { success: true, data };
}

async function checkMount(attempt = 0) {
  console.log('checkMount()', attempt);
  try {
    attempt++;

    if (!(await fsp.readdir(global.mountFolder)).length && attempt < 15) {
      return new Promise((res, rej) => {
        setTimeout(() => {
          checkMount(attempt).then(res).catch(rej);
        }, _sec);
      });
    }

    const resp = await fetch('http://127.0.0.1:5572/rc/noop', {
      method: 'post',
    });

    global.mounted = resp.ok;
    console.log('checkMount', global.mounted);
    return global.mounted;
    //setTimeout(updateRcloneProgress, 2000);
  }
  catch (e) {
    console.warn('checkMount', e);
    global.mounted = false;
    return false;
  }
}

async function checkDeps(arg){
  console.log('checkDeps()', arg);
  let res = {
    [arg]: {
      version: false,
      cmd: false,
      error: false,
    }
  };

  try {
    if (arg == 'adb') {
      let globalAdb = false;
      try {
        globalAdb = await commandExists('adb');
      } catch (e) {}

      res[arg].cmd = adbCmd = globalAdb ? 'adb' : (await fetchBinary('adb'));
      try {
        await execShellCommand(`"${res[arg].cmd}" start-server`);
      }
      catch (err) {
        if (!err.toString().includes('daemon started successfully'))
          throw err;
      }

      res[arg].version = 'adbkit v.' + (await adb.version()) + '\n' + await execShellCommand(`"${res[arg].cmd}" version`);

      await trackDevices();
    }

    if (arg == 'rclone') {
      // module with autodownload https://github.com/sntran/rclone.js/blob/main/index.js
      // res.rclone.cmd = global.currentConfiguration.rclonePath || await commandExists('rclone');
      res[arg].cmd = await fetchBinary('rclone');
      res[arg].version = await execShellCommand(`"${res[arg].cmd}" --version`);
    }

    if (arg == 'zip') {
      res[arg].cmd = await fetchBinary('7za');
      res[arg].version = await execShellCommand(`"${res[arg].cmd}" --help ${grep_cmd} "7-Zip"`);
      console.log(res[arg].version);
    }

    if (arg == 'scrcpy') {
      res[arg].cmd = global.currentConfiguration.scrcpyPath || await commandExists('scrcpy');
      try {
        res[arg].version = await execShellCommand(`"${res[arg].cmd}" --version`);
      }
      catch(err) {
        res[arg].version = err; // don`t know why version at std_err((
      }
    }
  }
  catch (e) {
    console.error('checkDeps', arg, e);
    res[arg].error = e && e.toString();
  }

  res.success = true;
  return res;
}

async function fetchBinary(bin) {
  const cfgKey = `${bin}Path`;
  const cmd = global.currentConfiguration[cfgKey];
  if (cmd) return cmd;

  const file = global.platform == 'win' ? `${bin}.exe` : bin;

  const binPath = path.join(sidenoderHome, file);
  const branch = /*bin == 'rclone' ? 'new' :*/ 'master';
  const binUrl = `https://raw.githubusercontent.com/vKolerts/${bin}-bin/${branch}/${global.platform}/${global.arch}/${file}`;
  await fetchFile(binUrl, binPath);

  if (bin == 'adb' && global.platform == 'win') {
    const libFile = 'AdbWinApi.dll';
    const libUrl = `https://raw.githubusercontent.com/vKolerts/${bin}-bin/master/${global.platform}/${global.arch}/${libFile}`;
    await fetchFile(libUrl, path.join(sidenoderHome, libFile));

    const usbLibFile = 'AdbWinUsbApi.dll';
    const usbLibUrl = `https://raw.githubusercontent.com/vKolerts/${bin}-bin/master/${global.platform}/${global.arch}/${usbLibFile}`;
    await fetchFile(usbLibUrl, path.join(sidenoderHome, usbLibFile));
  }

  return changeConfig(cfgKey, binPath);
}

async function fetchFile(url, dest) {
  console.log('fetchFile', { url, dest });
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Can't download '${url}': ${resp.statusText}`);

  if (await fsp.exists(dest)) await fsp.unlink(dest);
  return fsp.writeFile(dest, await resp.buffer(), { mode: 0o755 });
}

function returnError(message) {
  console.log('returnError()');
  global.win.loadURL(`file://${__dirname}/views/error.twig`)
  global.twig.view = {
    message: message,
  }
}


async function killRClone() {
  RCLONE_ID++;
  const killCmd = platform == 'win'
    ? `taskkill.exe /F /T /IM rclone.exe`
    : `killall -9 rclone`;
  console.log('try kill rclone');
  return new Promise((res, rej) => {
    exec(killCmd, (error, stdout, stderr) => {
      if (error) {
        console.log(killCmd, 'error:', error);
        return rej(error);
      }

      if (stderr) {
        console.log(killCmd, 'stderr:', stderr);
        return rej(stderr);
      }

      console.log(killCmd, 'stdout:', stdout);
      return res(stdout);
    });
  })
}

async function parseRcloneSections(newCfg = false) {
  console.warn('parseRcloneSections', newCfg);
  if (!global.currentConfiguration.rclonePath) {
    return console.error('rclone binary not defined');
  }

  if (!global.currentConfiguration.rcloneConf) {
    return console.error('rclone config not defined');
  }

  try {
    const rcloneCmd = global.currentConfiguration.rclonePath;
    const out = await execShellCommand(`"${rcloneCmd}" --config="${global.currentConfiguration.rcloneConf}" config list`);
    if (!out) {
      return console.error('rclone config is empty', global.currentConfiguration.rcloneConf, out);
    }

    const sections = out.split('\n');
    if (sections.length) sections.pop();
    if (!sections.length) {
      return console.error('rclone config sections not found', global.currentConfiguration.rcloneConf, { out, sections });
    }

    global.rcloneSections = sections;
  }
  catch (err) {
    const cfg = await fsp.readFile(global.currentConfiguration.rcloneConf, 'utf8');

    if (!cfg) return console.error('rclone config is empty', global.currentConfiguration.rcloneConf);

    const lines = cfg.split('\n');
    let sections = [];
    for (const line of lines) {
      if (line[0] != '[') continue;
      const section = line.match(/\[(.*?)\]/)[1];
      sections.push(section);
    }

    global.rcloneSections = sections;
  }

  if (newCfg || !global.currentConfiguration.cfgSection) {
    await changeConfig('cfgSection', global.rcloneSections[0]);
  }

  // console.log({ sections: global.rcloneSections });
  return global.rcloneSections;
}

async function umount() {
  if (platform == 'win') {
    if (!(await fsp.exists(global.mountFolder))) return;

    await fsp.rmdir(global.mountFolder, { recursive: true });
    return;
  }

  await execShellCommand(`umount "${global.mountFolder}"`, true);
  await execShellCommand(`fusermount -uz "${global.mountFolder}"`, true);
  await fsp.mkdir(global.mountFolder, { recursive: true });
}

async function mount() {
  if (!global.currentConfiguration.rclonePath || !global.currentConfiguration.rcloneConf) {
    win.webContents.send('alert', 'Rclone not configured');
  }

  // if (await checkMount(13)) {
    // return;
    try {
      await killRClone();
    }
    catch (err) {
      console.log('rclone not started');
    }
  // }

  await umount();

  if (global.mounted) {
    return global.mounted = false;
  }

  const myId = RCLONE_ID;
  const mountCmd = global.currentConfiguration.mountCmd;
  const rcloneCmd = global.currentConfiguration.rclonePath;
  console.log('start rclone');
  exec(`"${rcloneCmd}" ${mountCmd} --read-only --rc --rc-no-auth --config="${global.currentConfiguration.rcloneConf}" ${global.currentConfiguration.cfgSection}: "${global.mountFolder}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('rclone error:', error);
      if (RCLONE_ID != myId) error = false;
      console.log({ RCLONE_ID, myId });
      win.webContents.send('check_mount', { success: false, error });
      // checkMount();
      /*if (error.message.search('transport endpoint is not connected')) {
        console.log('GEVONDE');
      }*/

      return;
    }

    if (stderr) {
      console.log('rclone stderr:', stderr);
      return;
    }

    console.log('rclone stdout:', stdout);
  });
}

function resetCache(folder) {
  console.log('resetCache', folder);
  const oculusGamesDir = path.join(global.mountFolder, global.currentConfiguration.mntGamePath).replace(/\\/g, '/');

  if (folder == oculusGamesDir) {
    cacheOculusGames = false;
    return true;
  }

  return false;
}


async function getDir(folder) {
  const oculusGamesDir = path.join(global.mountFolder, global.currentConfiguration.mntGamePath).replace(/\\/g, '/');
  //console.log(folder, oculusGamesDir);
  if (
    folder == oculusGamesDir
    && global.currentConfiguration.cacheOculusGames
    && cacheOculusGames
  ) {
    console.log('getDir return from cache', folder);
    return cacheOculusGames;
  }

  try {
    const files = await fsp.readdir(folder/*, { withFileTypes: true }*/);
    let gameList = {};
    let gameListName2Package = {};
    let installedApps = {}
    let gameListName = false;
    try {
      // throw 'test';
      for (const name of GAME_LIST_NAMES) {
        if (!fs.existsSync(path.join(folder, name))) continue;
        // if (!files.includes(name)) continue;
        gameListName = name;
        break;
      }

      if (gameListName) {
        const list = (await fsp.readFile(path.join(folder, gameListName), 'utf8')).split('\n');
        let listVer;
        if (!list.length) throw gameListName + ' is empty';

        for (const line of list) {
          const meta = line.split(';');
          if (!listVer) {
            listVer = meta[2] == 'Release APK Path' ? 1 : 2;
            console.log({ gameListName, listVer });
            continue;
          }

          if (listVer == 1) {
            gameList[meta[1]] = {
              simpleName: meta[0],
              releaseName: meta[1],
              packageName: meta[3],
              versionCode: meta[4],
              versionName: meta[5],
              imagePath: `file://${global.tmpdir}/mnt/${global.currentConfiguration.mntGamePath}/.meta/thumbnails/${meta[3]}.jpg`,
            }
          }
          else if (listVer == 2) {
            gameList[meta[1]] = {
              simpleName: meta[0],
              releaseName: meta[1],
              packageName: meta[2],
              versionCode: meta[3],
              imagePath: `file://${global.tmpdir}/mnt/${global.currentConfiguration.mntGamePath}/.meta/thumbnails/${meta[2]}.jpg`,
              size: meta[5],
            }
          }

        }
      }
    }
    catch (err) {
      console.error(`${gameListName} failed`, err);
      gameListName = {
        err: `Can't parse GameList.txt
          <br/>Maybe issue of server - please attempt to switch mirror at settings.
          <br/>Actual mirrors posted there <a class="btn btn-sm btn-info" onclick=shell.openExternal('http://t.me/sidenoder')> http://t.me/sidenoder</a>`,
      };
    }

    // console.log(gameList);

    try {
      if (global.adbDevice) {
        installedApps = await getInstalledApps(true);
      }
    }
    catch (err) {
      console.error('Can`t get installed apps', err);
    }

    let fileNames = await Promise.all(files.map(async (fileName) => {
      // console.log(fileName);

      const info = await fsp.lstat(path.join(folder, fileName));
      let steamId = false,
        sqId = false,
        oculusId = false,
        imagePath = false,
        versionCode = '',
        versionName = '',
        simpleName = fileName,
        packageName = false,
        note = '',
        kmeta = false,
        mp = false,
        installed = 0,
        size = false,
        newItem = false;

      const gameMeta = gameList[fileName];

      if (gameMeta) {
        simpleName = gameMeta.simpleName;
        packageName = gameMeta.packageName;
        versionCode = gameMeta.versionCode;
        versionName = gameMeta.versionName;
        simpleName = gameMeta.simpleName;
        size = gameMeta.size;
        // imagePath = gameMeta.imagePath;

        let regex = /\((.*?)\)/;
        if (regex.test(gameMeta.releaseName)) {
          const match = gameMeta.releaseName.match(regex)[0];
          note += match.replace(', only autoinstalls with Rookie', '');
        }
      }

      // Include local notes. This allows users to add notes in brackets to
      // their filenames to override the original note. These notes are rendered
      // in the game's browse card.
      let regex = /\((.*?)\)/;
      if (regex.test(fileName)) {
        const match = fileName.match(/\((.*?)\)/)[0];
        if (match !== note) {
          // This note differs from the original so it has been overriden in the
          // filename, so we replace it.
          note = match.replace(', only autoinstalls with Rookie', '');
        }
      }

      regex = /^([\w -.,!?&+™®'"]+) v\d+\+/;
      if (gameListName && !packageName && regex.test(fileName)) {
        simpleName = fileName.match(regex)[1];
        packageName = KMETAS2[escString(simpleName)];
      }

      regex = /v(\d+)\+/;
      if (!versionCode && regex.test(fileName)) {
        versionCode = fileName.match(regex)[1];
      }

      regex = /v\d+\+([\w.]*) /;
      if (!versionName && regex.test(fileName)) {
        versionName = fileName.match(regex)[1];
      }

      if (!versionCode && (new RegExp('.*\ -versionCode-')).test(fileName)) {
        versionCode = fileName.match(/-versionCode-([0-9]*)/)[1];
      }

      if (!packageName && (new RegExp('.*\ -packageName-')).test(fileName)) {
        packageName = fileName.match(/-packageName-([a-zA-Z0-9.]*)/)[1];
      }

      // obbs path the same =(
      if (gameListName && !packageName && KMETAS[fileName]) {
        packageName = fileName;
      }


      if (packageName) {
        if (QUEST_ICONS.includes(packageName + '.jpg')) {
          imagePath = `https://raw.githubusercontent.com/vKolerts/quest_icons/master/250/${packageName}.jpg`;
        }
        else if (!imagePath) {
          imagePath = 'unknown.png';
        }

        kmeta = KMETAS[packageName];
        installedApp = installedApps[packageName];
        if (installedApp) {
          installed = 1;
          if (versionCode && versionCode > installedApp.versionCode) {
            installed++;
          }
        }
      }

      if (gameListName && !packageName && versionCode) {
        packageName = 'can`t parse package name';
        imagePath = 'unknown.png';
      }

      if (kmeta) {
        steamId = !!(kmeta.steam && kmeta.steam.id);
        oculusId = !!(kmeta.oculus && kmeta.oculus.id);
        sqId = !!(kmeta.sq && kmeta.sq.id);
        simpleName = kmeta.simpleName || simpleName;
        mp = kmeta.mp || !!kmeta.mp;
      }
      else {
        newItem = true;
      }

      simpleName = await cleanUpFoldername(simpleName);
      const isFile = info.isFile()
        || (info.isSymbolicLink() && fileName.includes('.')); // not well

      return {
        name: fileName,
        simpleName,
        isFile,
        isLink: info.isSymbolicLink(),
        steamId,
        sqId,
        oculusId,
        imagePath,
        versionCode,
        versionName,
        packageName,
        size,
        note,
        newItem,
        info,
        mp,
        installed,
        createdAt: new Date(info.mtimeMs),
        filePath: path.join(folder, fileName).replace(/\\/g, '/'),
      };
    }));
    // console.log({ fileNames });

    fileNames.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
    // console.log(fileNames)

    if (
      folder == oculusGamesDir
      && global.currentConfiguration.cacheOculusGames
    ) {
      console.log('getDir cached', folder);
      cacheOculusGames = fileNames;
    }

    if (gameListName && gameListName.err) {
      fileNames.unshift({name: gameListName.err});
    }

    return fileNames;
  }
  catch (error) {
    console.error('Can`t open folder ' + folder, error);
    //returnError(e.message)
    return false;
  }
}

async function cleanUpFoldername(simpleName) {
  // simpleName = simpleName.split('-packageName-')[0];
  simpleName = simpleName.split('-versionCode-')[0];
  simpleName = simpleName.split(/ v[0-9]/)[0];
  return simpleName;
}

async function getDirListing(folder){
  const files = await fsp.readdir(folder);
  let fileNames = await Promise.all(files.map(async (file) => {
    return path.join(folder, file).replace(/\\/g, '/')
  }));

  return fileNames;
}


async function backupApp({ location, package }) {
  console.log('backupApp()', package, location);
  let apk = await adbShell(`pm list packages -f ${package}`);
  apk = apk.replace('package:', '').replace(`=${package}`, '');

  folderName = package;
  for (const app of global.installedApps) {
    if (app['packageName'] != package) continue;
    folderName = `${app['simpleName']} -versionCode-${app['versionCode']} -packageName-${package}`;
    break;
  }

  location = path.join(location, folderName);
  console.log({ location, apk });

  await fsp.mkdir(location, { recursive: true });
  await adbPull(apk, path.join(location, 'base.apk'));
  const obbsPath = `/sdcard/Android/obb/${package}`;
  if (!(await adbFileExists(obbsPath))) return true;

  await adbPullFolder(obbsPath, path.join(location, package));

  return true;
}

const backupPrefsPath = '/sdcard/Download/backup/data/data';
async function backupAppData(packageName, backupPath = path.join(global.sidenoderHome, 'backup_data')) {
  console.log('backupAppData()', packageName);
  backupPath = path.join(backupPath, packageName);
  if (await adbFileExists(`/sdcard/Android/data/${packageName}`)) {
    await adbPullFolder(`/sdcard/Android/data/${packageName}`, path.join(backupPath, 'Android', packageName));
  }
  else {
    console.log(`skip backup Android/data/${packageName}`);
  }

  await copyAppPrefs(packageName);
  await adbPullFolder(`${backupPrefsPath}/${packageName}`, path.join(backupPath, 'data', packageName));
  await adbShell(`rm -r "${backupPrefsPath}/${packageName}"`);

  fsp.writeFile(`${backupPath}/time.txt`, Date.now());
  return true;
}

async function restoreAppData(packageName, backupPath = path.join(global.sidenoderHome, 'backup_data')) {
  console.log('restoreAppData()', packageName);
  backupPath = path.join(backupPath, packageName);
  if (!(await fsp.exists(backupPath))) throw `Backup not found ${backupPath}`;

  await adbPushFolder(path.join(backupPath, 'Android', packageName), `/sdcard/Android/data/${packageName}`);
  await adbPushFolder(path.join(backupPath, 'data', packageName), `${backupPrefsPath}/${packageName}`);
  await restoreAppPrefs(packageName);
  return true;
}

async function copyAppPrefs(packageName, removeAfter = false) {
  const cmd = removeAfter ? 'mv -f' : 'cp -rf';
  await adbShell(`mkdir -p "${backupPrefsPath}"`);
  return adbShell(`run-as ${packageName} ${cmd} "/data/data/${packageName}" "${backupPrefsPath}/"`);
}

async function restoreAppPrefs(packageName, removeAfter = true) {
  const cmd = removeAfter ? 'mv -f' : 'cp -rf';
  const backup_path = `${backupPrefsPath}/${packageName}`;
  if (!(await adbFileExists(backup_path))) return;

  return adbShell(`run-as ${packageName} ${cmd} "${backup_path}" "/data/data/"`);
}

async function sideloadFolder(arg) {
  location = arg.path;
  console.log('sideloadFolder()', arg);
  let res = {
    device: 'done',
    aapt: false,
    check: false,
    backup: false,
    uninstall: false,
    restore: false,
    download: false,
    apk: false,
    download_obb: false,
    push_obb: false,
    done: false,
    update: false,
    error: '',
    location,
  }

  win.webContents.send('sideload_process', res);

  if (location.endsWith('.apk')) {
    apkfile = location;
    location = path.dirname(location);
  }
  else {
    returnError('not an apk file');
    return;
  }

  console.log('start sideload: ' + apkfile);

  fromremote = false;
  if (location.includes(global.mountFolder)) {
    fromremote = true;
  }

  console.log('fromremote:', fromremote);

  packageName = '';
  let apktmp = '';
  try {
    if (!fromremote) {
      res.download = 'skip';
    }
    else {
      res.download = 'processing';
      win.webContents.send('sideload_process', res);

      apktmp = path.join(global.tmpdir, path.basename(apkfile));
      console.log('is remote, copying to '+ apktmp)

      if (await fsp.exists(apktmp)) {
        console.log('is remote, ' + apktmp + 'already exists, using');
        res.download = 'skip';
      }
      else {
        const tmpname = `${apktmp}.part`;
        if (await fsp.exists(tmpname)) await fsp.unlink(tmpname);
        await fsp.copyFile(apkfile, tmpname);
        await fsp.rename(tmpname, apktmp);
        res.download = 'done';
      }

      apkfile = apktmp;
    }
  }
  catch (e) {
    // returnError(e);
    console.error(e);
    res.download = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }

  res.aapt = 'processing';
  win.webContents.send('sideload_process', res);

  try {
    packageinfo = await getPackageInfo(apkfile);

    packageName = packageinfo.packageName;
    console.log({ apkfile, packageinfo, packageName });
  }
  catch (e) {
    // returnError(e);
    console.error(e);
    res.aapt = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }

  if (!packageName) {
    const e = `Can't parse packageName of ${apkfile}`;
    // returnError(new Error(e));
    console.error(e);
    res.aapt = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }


  res.aapt = 'done';
  res.check = 'processing';
  win.webContents.send('sideload_process', res);

  console.log('checking if installed');
  let installed = false;
  try {
    installed = await adb.getDevice(global.adbDevice).isInstalled(packageName);
    res.check = 'done';
  }
  catch (err) {
    console.error('check', e);
    res.check = 'fail';
    res.error = e;
    // TODO: maybe return;
  }

  res.backup = 'processing';
  win.webContents.send('sideload_process', res);
  // const backup_path = `${global.tmpdir}/sidenoder_restore_backup/`;
  const backup_path = '/sdcard/Download/backup/Android/data/';

  // TODO: if adbExist
  if (installed) {
    console.log('doing adb pull appdata (ignore error)');
    try {
      await adbShell(`mkdir -p "${backup_path}"`);
      await adbShell(`mv "/sdcard/Android/data/${packageName}" "${backup_path}"`);
      await copyAppPrefs(packageName);
      // await backupAppData(packageName, backup_path);
      res.backup = 'done';
    }
    catch (e) {
      console.error('backup', e);
      res.backup = 'fail';
      res.error = e;
    // TODO: maybe return;
    }
  }
  else {
    res.backup = 'skip';
  }

  res.uninstall = 'processing';
  win.webContents.send('sideload_process', res);

  if (installed) {
    console.log('doing adb uninstall (ignore error)');
    try {
      await adb.getDevice(global.adbDevice).uninstall(packageName);
      res.uninstall = 'done';
      console.log('uninstall done', packageName);
    }
    catch (e) {
      console.error('uninstall', e);
      res.uninstall = 'fail';
      res.error = e;
    }
  }
  else {
    res.uninstall = 'skip';
  }

  console.log('doing adb install');
  res.apk = 'processing';
  win.webContents.send('sideload_process', res);

  try {
    await adbInstall(apkfile);
    console.log('apk done', packageName);
    res.apk = 'done';
  }
  catch (e) {
    // returnError(e);
    console.error(e);
    res.apk = 'fail';
    res.done = 'fail';
    res.error = e;
    return win.webContents.send('sideload_process', res);
  }

  res.restore = 'processing';
  win.webContents.send('sideload_process', res);

  if (/*installed || */await adbFileExists(`${backup_path}${packageName}`)) {
    console.log('doing adb push appdata (ignore error)');
    try {
      // await restoreAppData(packageName, backup_path);
      await adbShell(`mv "${backup_path}${packageName}" "/sdcard/Android/data/"`);
      await restoreAppPrefs(packageName);
      res.restore = 'done';
      console.log('restore done', packageName);
    }
    catch (e) {
      console.error('restore', e);
      res.restore = 'fail';
      res.error = e;
      // TODO: maybe return;
    }
  }
  else {
    res.restore = 'skip';
  }

  res.remove_obb = 'processing';
  win.webContents.send('sideload_process', res);

  const obbFolderOrig = path.join(location, packageName);
  console.log({ obbFolderOrig });
  try {
    if (!(await fsp.exists(obbFolderOrig))) throw 'Can`t find obbs folder';
    obbFolderDest = `/sdcard/Android/obb/${packageName}`;
    console.log('DATAFOLDER to copy:' + obbFolderDest);
  }
  catch (error) {
    console.log(error);
    obbFolderDest = false;
    res.remove_obb = 'skip';
    res.download_obb = 'skip';
    res.push_obb = 'skip';
    win.webContents.send('sideload_process', res);
  }

  let obbFiles = [];
  if (!obbFolderDest) {
    res.download_obb = 'skip';
    res.push_obb = 'skip';
  }
  else {
    console.log('doing obb rm');
    try {
      await adbShell(`rm -r "${obbFolderDest}"`);
      res.remove_obb = 'done';
      console.log('remove_obb done', packageName);
    }
    catch (e) {
      res.remove_obb = 'skip';
      //console.log(e);
    }

    res.download_obb = 'processing';
    win.webContents.send('sideload_process', res);

    try {
      obbFiles = await fsp.readdir(obbFolderOrig);
      console.log('obbFiles: ', obbFiles.length);

      res.download_obb = (fromremote ? '0' : obbFiles.length) + '/' + obbFiles.length;
      res.push_obb = '0/' + obbFiles.length;
      win.webContents.send('sideload_process', res);

      const tmpFolder = path.join(global.tmpdir, packageName);
      if (fromremote) {
        await fsp.mkdir(tmpFolder, { recursive: true });
      }

      for (const obbName of obbFiles) {
        const obb = path.join(obbFolderOrig, obbName);
        console.log('obb File: ' + obbName);
        console.log('doing obb push');
        const destFile = `${obbFolderDest}/${obbName}`;

        if (fromremote) {
          const obbtmp = path.join(tmpFolder, obbName);
          console.log('obb is remote, copying to ' + obbtmp);

          if (await fsp.exists(obbtmp)) {
            console.log(`obb is remote, ${obbtmp} already exists, using`);
          }
          else {
            const tmpname = `${obbtmp}.part`;
            if (await fsp.exists(tmpname)) await fsp.unlink(tmpname);
            await fsp.copyFile(obb, tmpname);
            await fsp.rename(tmpname, obbtmp);
          }

          res.download_obb = (+res.download_obb.split('/')[0] + 1) + '/' + obbFiles.length;
          win.webContents.send('sideload_process', res);

          await adbPush(obbtmp, `${destFile}`);
        }
        else {
          await adbPush(obb, `${destFile}`);
        }

        res.push_obb = (+res.push_obb.split('/')[0] + 1) + '/' + obbFiles.length;
        win.webContents.send('sideload_process', res);
      }

      if (fromremote) {
        //TODO: check settings
        await fsp.rmdir(tmpFolder, { recursive: true });
      }
    }
    catch (e) {
      console.error('obbs processing', e);
      if (fromremote) {
        res.download_obb = 'fail';
      }

      res.push_obb = 'fail';
      res.done = 'fail';
      res.error = e;
      return win.webContents.send('sideload_process', res);
    }
  }

  if (fromremote) {
    //TODO: check settings
    await fsp.unlink(apktmp);
  }

  res.done = 'done';
  res.update = arg.update;
  win.webContents.send('sideload_process', res);
  console.log('DONE');
  return;
}



async function getPackageInfo(apkPath) {
  const reader = await ApkReader.open(apkPath);
  const manifest = await reader.readManifest();

  info = {
    packageName: manifest.package,
    versionCode: manifest.versionCode,
    versionName: manifest.versionName,
  };

  return info;
}

async function getInstalledApps(obj = false) {
  let apps = await adbShell(`pm list packages -3 --show-versioncode`);
  apps = apps.split('\n');
  // apps.pop();
  appinfo = {};

  for (const appLine of apps) {
    const [packageName, versionCode] = appLine.slice(8).split(' versionCode:');

    const info = [];
    info['simpleName'] = KMETAS[packageName] && KMETAS[packageName].simpleName || packageName;
    info['packageName'] = packageName;
    info['versionCode'] = versionCode;
    info['imagePath'] = QUEST_ICONS.includes(packageName + '.jpg')
      ? `https://raw.githubusercontent.com/vKolerts/quest_icons/master/250/${packageName}.jpg`
      : `http://cdn.apk-cloud.com/detail/image/${packageName}-w130.png`//'unknown.png';

    appinfo[packageName] = info;
  }


  global.installedApps = Object.values(appinfo);

  return obj ? appinfo : global.installedApps;
}

async function getInstalledAppsWithUpdates() {
  const remotePath = path.join(global.mountFolder, global.currentConfiguration.mntGamePath); // TODO: folder path to config
  const list = await getDir(remotePath);
  let remotePackages = {};
  let remoteList = {};

  if (list) for (const app of list) {
    const { name, packageName, versionCode, simpleName, filePath, size } = app;
    if (!packageName) continue;

    if (!remotePackages[packageName]) remotePackages[packageName] = [];
    remotePackages[packageName].push(name);

    remoteList[name] = {
      versionCode,
      simpleName,
      filePath,
      size,
    };
  };

  const remoteKeys = Object.keys(remotePackages);

  const apps = global.installedApps || await getInstalledApps();
  let updates = [];
  for (const app of apps) {
    const packageName = app['packageName'];
    // console.log(packageName, 'checking');

    if (!remoteKeys.includes(packageName)) continue;

    for (name of remotePackages[packageName]) {
      const package = remoteList[name];
      const installedVersion = app['versionCode'];
      const remoteversion = package.versionCode;

      // console.log({ packageName, installedVersion, remoteversion });
      // console.log({ package });

      if (remoteversion <= installedVersion) continue;

      app['simpleName'] = package.simpleName;
      app['update'] = [];
      app['update']['path'] = package.filePath;
      app['update']['size'] = package.size;
      app['update']['versionCode'] = remoteversion;
      updates.push(app);

      console.log(packageName, 'UPDATE AVAILABLE');
    }
  }

  global.installedApps = false;
  return updates;
}


async function detectNoteTxt(files, folder) {
  // TODO: check .meta/notes

  if (typeof files == 'string') {
    folder = files;
    files = false;
  }

  if (!files) {
    files = await fsp.readdir(folder);
  }

  if (files.includes('notes.txt')) {
    return fsp.readFile(path.join(folder, 'notes.txt'), 'utf8');
  }

  return false;
}

async function detectInstallTxt(files, folder) {
  if (typeof files == 'string') {
    folder = files;
    files = false;
  }

  if (!files) {
    files = await fsp.readdir(folder);
  }

  const installTxNames = [
    'install.txt',
    'Install.txt',
  ];

  for (const name of installTxNames) {
    if (files.includes(name)) {
      return fsp.readFile(path.join(folder, name), 'utf8');
    }
  }

  return false;
}


async function getApkFromFolder(folder){
  let res = {
    path: false,
    install_desc: false,
  }

  const files = await fsp.readdir(folder);
  res.install_desc = await detectInstallTxt(files, folder);
  res.notes = await detectNoteTxt(files, folder);
  console.log({ files });

  for (file of files) {
    if (file.endsWith('.apk')) {
      res.path = path.join(folder, file).replace(/\\/g, "/");
      return res;
    }
  }

  returnError('No apk found in ' + folder);
  return res;
}

async function uninstall(packageName){
  resp = await adb.getDevice(global.adbDevice).uninstall(packageName);
}


let rcloneProgress = false;
async function updateRcloneProgress() {
  try {
    const response = await fetch('http://127.0.0.1:5572/core/stats', { method: 'POST' })
    const data = await response.json();
    if (!data.transferring || !data.transferring[0]) throw 'no data';
    const transferring = data.transferring[0];
    rcloneProgress = {
      cmd: 'download',
      bytes: transferring.bytes,
      size: transferring.size,
      percentage: transferring.percentage,
      speedAvg: transferring.speedAvg,
      eta: transferring.eta,
      name: transferring.name,
    };
    //console.log('sending rclone data');
    win.webContents.send('process_data', rcloneProgress);
  }
  catch (error) {
    //console.error('Fetch-Error:', error);
    if (rcloneProgress) {
      rcloneProgress = false;
      win.webContents.send('process_data', rcloneProgress);
    }
  }

  setTimeout(updateRcloneProgress, 2000);
}

async function init() {
  fsp.exists = (p) => fsp.access(p).then(() => true).catch(e => false);

  await initLogs();

  console.log({ platform, arch, version, sidenoderHome }, process.platform, process.arch, process.argv);

  await loadMeta();
}

async function loadMeta() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/vKolerts/quest_icons/master/version?' + Date.now());
    version = await res.text();
    if (version == META_VERSION) return setTimeout(loadMeta, CHECK_META_PERIOD);

    META_VERSION = version;
    console.log('Meta version', META_VERSION);
  }
  catch (err) {
    console.error('can`t get meta version', err);
  }

  try {
    const res = await fetch('https://raw.githubusercontent.com/vKolerts/quest_icons/master/list.json?' + Date.now());
    QUEST_ICONS = await res.json();
    console.log('icons list loaded');
  }
  catch (err) {
    console.error('can`t get quest_icons', err);
  }

  try {
    const res = await fetch('https://raw.githubusercontent.com/vKolerts/quest_icons/master/.e?' + Date.now());
    const text = await res.text();
    const iv = Buffer.from(text.substring(0, l), 'hex');
    const secret = crypto.createHash(hash_alg).update(pkg.author.split(' ')[0].repeat(2)).digest('base64').substr(0, l);
    const decipher = crypto.createDecipheriv('aes-256-cbc', secret, iv);
    const encrypted = text.substring(l);
    KMETAS = JSON.parse(decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8'));
    for (const package of Object.keys(KMETAS)) {
      KMETAS2[escString(KMETAS[package].simpleName)] = package;
    }

    console.log('kmetas loaded');
  }
  catch (err) {
    console.error('can`t get kmetas', err);
  }

  setTimeout(loadMeta, CHECK_META_PERIOD);
}

function escString(val) {
  let res = val.toLowerCase();
  res = res.replace(/[-\_:.,!?\"'&™®| ]/g, '');
  return res;
}

async function initLogs() {
  const log_path = path.join(sidenoderHome, 'debug_last.log');
  if (await fsp.exists(log_path)) {
    await fsp.unlink(log_path);
  }
  else {
    await fsp.mkdir(sidenoderHome, { recursive: true });
  }

  const log_file = fs.createWriteStream(log_path, { flags: 'w' });
  const log_stdout = process.stdout;

  function dateF() {
    const d = new Date();
    return `[${d.toLocaleString()}.${d.getMilliseconds()}] `;
  }

  console.log = function(...d) {
    let line = '';
    let line_color = '';
    for (const l of d) {
      if (typeof l == 'string') {
        line += l + ' ';
        line_color += l + ' ';
        continue;
      }

      const formated = util.format(l);
      line += formated + ' ';
      line_color += '\x1b[32m' + formated + '\x1b[0m ';
    }

    log_stdout.write(dateF() + line_color + '\n');
    log_file.write(dateF() + line + '\n');
  };

  console.error = function(...d) {
    let line = '';
    for (const l of d) {
      line += util.format(l) + ' ';
    }

    log_stdout.write(`\x1b[31m${dateF()}ERROR: ` + line + '\x1b[0m\n');
    log_file.write(dateF()+ 'ERROR: ' + line + '\n');
  };

  console.warning = function(...d) {
    let line = '';
    for (const l of d) {
      line += util.format(l) + ' ';
    }

    log_stdout.write(`\x1b[33m${dateF()}WARN: ` + line + '\x1b[0m\n');
    log_file.write(dateF() + 'WARN: ' + line + '\n');
  };
}

async function fetchTimeout(url = '', options = {}, timeout = 20 * 1000) {
  const controller = new AbortController();
  options.signal = controller.signal;
  setTimeout(() => {
    controller.abort()
  }, timeout);

  return fetch(url, options);
}



async function saveConfig(config = global.currentConfiguration) {
  await fsp.writeFile(configLocation, JSON.stringify(config, null, ' '));
}

async function reloadConfig() {
  const defaultConfig = {
    allowOtherDevices: false,
    cacheOculusGames: true,
    autoMount: true,
    adbPath: '',
    rclonePath: '',
    rcloneConf: '',
    mountCmd: 'mount',
    cfgSection: 'VRP-mirror13',
    snapshotsDelete: true,
    mntGamePath: 'Quest Games',
    scrcpyBitrate: '5',
    scrcpyCrop: '1600:900:2017:510',
    lastIp: '',
    userHide: false,
    dirBookmarks: [
      { name: 'Sidenoder folder', path: global.sidenoderHome },
    ],

    proxyUrl: '',
    proxyOculus: false,
    proxySteam: false,
    proxySQ: false,
  };

  if (await fsp.exists(configLocationOld)) {
    await fsp.rename(configLocationOld, configLocation);
  }


  if (await fsp.exists(configLocation)) {
    console.log('Config exist, using ' + configLocation);
    global.currentConfiguration = Object.assign(defaultConfig, require(configLocation));
  }
  else {
    console.log('Config doesnt exist, creating ') + configLocation;
    await saveConfig(defaultConfig);
    global.currentConfiguration = defaultConfig;
  }

  if (global.currentConfiguration.tmpdir) {
    global.tmpdir = global.currentConfiguration.tmpdir;
  }

  if (!global.currentConfiguration.dirBookmarks) {
    global.currentConfiguration.dirBookmarks = defaultConfig.dirBookmarks;
  }

  proxySettings()

  await parseRcloneSections();
}

function proxySettings(proxyUrl = global.currentConfiguration.proxyUrl) {
  const { proxyOculus, proxySteam, proxySQ } = global.currentConfiguration;

  agentOculus = proxyUrl && proxyOculus ? new SocksProxyAgent(proxyUrl) : undefined;
  agentSteam = proxyUrl && proxySteam ? new SocksProxyAgent(proxyUrl) : undefined;
  agentSQ = proxyUrl && proxySQ ? new SocksProxyAgent(proxyUrl) : undefined;
}

async function changeConfig(key, value) {
  console.log('cfg.update', key, value);
  if (key == 'proxyUrl') proxySettings(value);
  if (['proxyOculus', 'proxySteam', 'proxySQ'].includes(key)) proxySettings();

  global.currentConfiguration[key] = value;
  await saveConfig();

  if (key == 'rcloneConf') await parseRcloneSections(true);
  if (key == 'tmpdir') global.tmpdir = value || require('os').tmpdir().replace(/\\/g, '/');

  return value;
}
