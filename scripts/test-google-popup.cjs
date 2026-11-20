const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the installed Expo web implementation with two isolated window contexts.
// No real Google tokens, browser account, or application authentication bypass is used.
const providerPath = path.join(path.dirname(require.resolve('expo-web-browser/package.json')), 'src/ExpoWebBrowser.web.ts');
const code = ts.transpileModule(fs.readFileSync(providerPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function webBrowser(window) {
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, window, URL, TextEncoder, setInterval, clearInterval,
    require: name => {
      if (name === 'expo') return { CodedError: class extends Error {} };
      if (name === 'react-native') return { AppState: { addEventListener: () => ({ remove() {} }) } };
      if (name === './WebBrowser.types') return { WebBrowserResultType: { CANCEL: 'cancel', DISMISS: 'dismiss', OPENED: 'opened' } };
      throw new Error('Unexpected import: ' + name);
    },
  }, { filename: providerPath });
  return module.exports.default;
}
async function main() {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const listeners = new Set();
  const popup = { closed: false, focus() {}, close() { this.closed = true; } };
  const parent = {
    localStorage: storage, location: new URL('http://localhost:8082/signin'),
    screen: { width: 1280, height: 900 }, open: () => popup,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    postMessage(data) { for (const listener of listeners) listener({ isTrusted: true, origin: 'http://localhost:8082', data }); },
  };
  const browser = webBrowser(parent);
  try {
    const result = browser.openAuthSessionAsync('https://accounts.google.com/o/oauth2/v2/auth?state=regression-state', 'http://localhost:8082');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(listeners.size, 1);
    const callback = { localStorage: storage, opener: parent, parent, location: new URL('http://localhost:8082/signin#state=regression-state&access_token=test-only-token') };
    const child = webBrowser(callback);
    assert.equal(child.maybeCompleteAuthSession({}).type, 'failed');
    assert.equal(popup.closed, false);
    callback.location = new URL('http://localhost:8082/#state=regression-state&access_token=test-only-token');
    assert.equal(child.maybeCompleteAuthSession({}).type, 'success');
    const completed = await result;
    assert.equal(completed.type, 'success');
    assert.match(completed.url, /access_token=test-only-token/);
    assert.equal(popup.closed, true);
    assert.equal(listeners.size, 0);
    assert.equal(values.size, 0);
    console.log('PASS Expo: callback al origen devuelve el token, cierra el popup y limpia la sesión temporal.');
    console.log('PASS Expo: callback en /signin se rechaza si no coincide con el redirectUri.');
  } finally { browser.dismissAuthSession(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
