const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const now = Date.now();
let context;
let destination;
const navigations = [];
const Button = ({ title, disabled, onPress }) => {
  navigations.push({ title, disabled, onPress });
  return React.createElement('button', { disabled }, title);
};
const box = ({ children }) => React.createElement('div', null, children);
const mocks = {
  'react-native': { Text: box, View: box, Pressable: box },
  'expo-router': {
    router: { replace: route => { destination = route; }, push() {} },
    useFocusEffect() {},
    useLocalSearchParams: () => ({ unlocked: '1' }),
  },
  '@/context/AppContext': { useApp: () => context },
  '@/hooks/use-now': { useNow: () => now },
  '@/services/reminders': { scheduleReminder: async () => {} },
  '@/components/ui': {
    Text: box, Card: box, Badge: box, Chip: Button, Button,
    Page: ({ children, footer }) => React.createElement('main', null, children, footer),
    s: {},
  },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file, module);
  cache.set(file, mod);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = id => {
    if (mocks[id]) return mocks[id];
    if (!id.startsWith('.') && !id.startsWith('@/')) return require(id);
    const base = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(file), id);
    return load(['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate)));
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, file);
  return mod.exports;
}
const { plans, locations } = load(path.join(root, 'src/data/limaLocations.ts'));
const Home = load(path.join(root, 'src/screens/HomeScreen.tsx')).default;
const Plans = load(path.join(root, 'src/screens/PlansScreen.tsx')).default;
context = {
  state: { user: { name: 'Prueba' }, draft: { pickup: locations[0] } },
  account: { user: { id: 1 }, promoUsed: false, plansUnlocked: false, trips: [], subscription: null },
  events: [{ id: 1, title: 'Entrega Parcial', course: 'Taller', date: '2026-12-01', time: '08:00 AM' }],
  catalogPlans: plans, refresh: async () => {},
};
function render(Component) {
  navigations.length = 0;
  return renderToStaticMarkup(React.createElement(Component));
}
let html = render(Home);
assert.match(html, /80% de descuento en tu primer traslado/);
assert.doesNotMatch(html, /Alertas de calendario académico|Entrega Parcial/);
assert.match(html, /Programar traslado/);
context.account.promoUsed = true;
context.account.plansUnlocked = true;
html = render(Home);
assert.match(html, /Tarifa estándar/);
assert.match(html, /Ver planes con descuento/);
assert.doesNotMatch(html, /80%|Entrega Parcial/);
for (const plan of plans) {
  context.account.subscription = { ...plan, status: 'ACTIVE', startsAt: now - 1000, expiresAt: now + 86400000, remainingRides: 0 };
  html = render(Home);
  assert.ok(html.includes(`${plan.discountPercent}% dscto.`));
  assert.match(html, /Entrega Parcial|Avisarme 48h antes|Agendar/);
  assert.match(html, /Programar traslado/);
}
context.account.subscription.expiresAt = now;
html = render(Home);
assert.match(html, /Tarifa estándar/);
assert.doesNotMatch(html, /Entrega Parcial/);
html = render(Plans);
assert.match(html, /15% de descuento/);
assert.match(html, /25% de descuento/);
assert.match(html, /30% de descuento/);
const skip = navigations.find(button => button.title === 'Continuar sin plan (tarifa regular)');
assert.ok(skip && !skip.disabled);
skip.onPress();
assert.equal(destination, '/(tabs)');
console.log('PASS Home A/B/C, vencimiento, alertas y salida opcional de planes');
