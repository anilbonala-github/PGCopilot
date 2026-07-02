const runtimeGlobal = globalThis as typeof globalThis & {
  crypto?: Crypto & { randomUUID?: () => string };
};

if (typeof runtimeGlobal.crypto === 'object' && typeof runtimeGlobal.crypto.randomUUID !== 'function') {
  runtimeGlobal.crypto.randomUUID = () => {
    const bytes = new Uint8Array(16);
    runtimeGlobal.crypto!.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  };
}

const { registerRootComponent } = require('expo');
const App = require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
