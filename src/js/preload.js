const { contextBridge, ipcRenderer } = require('electron')
// const { blah } = require('./blah')
const { ProtectApi } = require('unifi-protect')

// event listeners
addEventListener('load', (event) => {
  run().then();
}, { once: true });

addEventListener( 'keydown', async (event) => {
  if (event.key === 'F9') {
    ipcRenderer.send('restart');
  }
  if (event.key === 'F10') {
    ipcRenderer.send('reset');
    ipcRenderer.send('restart');
  }
});


// electron events
const reset = () => ipcRenderer.send('reset');
const restart = () => ipcRenderer.send('restart');
const configSave = (config) => ipcRenderer.send('configSave', config);

const configLoad = () => ipcRenderer.invoke('configLoad');

contextBridge.exposeInMainWorld('electronAPI', {
  reset: () => reset(),
  restart: () => restart(),
  configSave: (config) => configSave(config),

  configLoad: () => configLoad(),
})



// logic
async function run() {
  // config/ start page
  if (checkUrl('index.html') || checkUrl('config.html'))
    return;

  // unifi stuff
  await wait(2000);

  // unifi stuff - login
  if (checkUrl('login')) {
    const config = await configLoad();

    setNativeValue(document.getElementsByName('username')[0], config.username);
    setNativeValue(document.getElementsByName('password')[0], config.password);

    clickElement(document.getElementsByTagName('button')[0]);


    await wait(2000);
  }

  // unifi stuff - fullscreen for liveview
  if (checkUrl('protect/liveview')) {
    // currently not needed
    if (elementExists(document.getElementsByClassName('ReactModalPortal'), 0))
        clickElement(document.getElementsByClassName('ReactModalPortal')[0]?.getElementsByTagName('svg')[0]);

    await wait(200);

    setStyle(document.getElementsByTagName('header')[0], 'display', 'none');
    setStyle(document.getElementsByTagName('nav')[0], 'display', 'none');
    setStyle(document.querySelectorAll("[class^=liveview__ViewportsWrapper]")[0], 'maxWidth', '100vw');
    setStyle(document.querySelectorAll("[class^=liveview__ViewportsWrapper]")[0], 'maxHeight', '100vh');

    const config = await configLoad();
    const url = new URL(config.url)
    const protectApi = new ProtectApi(url.hostname, config.username, config.password)
    const refresh = await protectApi.refreshDevices()
    const bootstrap = await protectApi.bootstrap
    let cameras = await protectApi.cameras
    console.log('MLM: bootstrap: ', bootstrap)
    console.log('MLM: cameras: ', cameras)

    const container = document.querySelector('[class^="LiveviewControls__ControlsBox"]')

    cameras.forEach((camera, index) => {
        addPrivacyButton(container, cameras, index, protectApi)
    })
  }
}

async function togglePrivacy(e, btn, cameras, index, protectApi) {
    e.stopPropagation()

    if (cameras[index].ledSettings.isEnabled) {
        cameras[index] = await protectApi.updateCamera(cameras[index], {
            micVolume: 0,
            recordingSettings: {
                mode: 'never'
            },
            ledSettings: {
                isEnabled: false
            },
            speakerSettings: {
                isEnabled: false,
                volume: 0
            },
            privacyZones: [{
                color: "#586CED",
                id: 1,
                name: "privacy",
                points: [[0,0],[1,0],[1,1],[0,1]]
            }]
        })
    } else {
        cameras[index] = await protectApi.updateCamera(cameras[index], {
            micVolume: 100,
            recordingSettings: {
                mode: 'always'
            },
            ledSettings: {
                isEnabled: true
            },
            speakerSettings: {
                isEnabled: true,
                volume: 100
            },
            privacyZones: []
        })
    }
    btn.innerHTML = `${cameras[index].name} ${cameras[index].ledSettings.isEnabled ? 'off' : 'on'}`
}

function addPrivacyButton(container, cameras, index, protectApi) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.innerHTML = `${cameras[index].name} ${cameras[index].ledSettings.isEnabled ? 'off' : 'on'}`
    btn.onclick = (e) => togglePrivacy(e, btn, cameras, index, protectApi)
    // You may have to absolutely position these in a grid or something
    btn.style.width = '70px'
    btn.style.height = '40px'
    btn.style.overflow = 'hidden'
    container.append(btn)
}

// fnc stuff
async function wait(amount) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, amount);
  });
}

function setNativeValue(element, value) {
  if (!element)
    return;

  const lastValue = element.value;
  element.value = value;
  const event = new Event("input", {target: element, bubbles: true});

  event.simulated = true;

  // React 16
  const tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }
  element.dispatchEvent(event);
}

function clickElement(element) {
  if (!element)
    return;

  if (element.click) {
    element.click();
  } else {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(event);
  }
}

function setStyle(element, style, value) {
  if (!element)
    return;

  element.style[style] = value;
}

function elementExists(elements, index = 0) {
  return elements.length > 0 && elements[index];
}

function checkUrl(urlPart) {
  return document.URL.includes(urlPart);
}
