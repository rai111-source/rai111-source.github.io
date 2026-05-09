const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Helper to load scripts.js into a mocked DOM context
function loadScriptsJS() {
  const code = fs.readFileSync(path.join(__dirname, '../js/scripts.js'), 'utf8');

  // Strip DOMContentLoaded wrapper
  let modifiedCode = code.replace(/document\.addEventListener\('DOMContentLoaded',\s*\(\)\s*=>\s*\{/, '');
  // Remove the closing bracket and parenthesis for the event listener at the very end
  modifiedCode = modifiedCode.replace(/\}\);\s*$/, '');
  // Change `let cart` to `var cart` to ensure it is accessible on the context object
  modifiedCode = modifiedCode.replace(/let cart = JSON\.parse/, 'var cart = JSON.parse');

  const context = {
    document: {
      querySelectorAll: () => [],
      getElementById: () => null,
      querySelector: () => null,
    },
    window: {
      location: { href: '' },
      pageYOffset: 0,
      scrollTo: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      }
    },
    console: {
      log: () => {},
      error: () => {}
    }
  };

  vm.createContext(context);
  vm.runInContext(modifiedCode, context);
  return context;
}

test('getCartTotal returns 0 when cart is empty', () => {
  const context = loadScriptsJS();
  context.cart = [];
  const total = context.getCartTotal();
  assert.strictEqual(total, 0);
});

test('getCartTotal calculates correctly for a single item', () => {
  const context = loadScriptsJS();
  context.cart = [
    { price: 10, quantity: 1 }
  ];
  const total = context.getCartTotal();
  assert.strictEqual(total, 10);
});

test('getCartTotal calculates correctly for multiple items', () => {
  const context = loadScriptsJS();
  context.cart = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 }
  ];
  const total = context.getCartTotal();
  // (10 * 2) + (5 * 3) = 20 + 15 = 35
  assert.strictEqual(total, 35);
});

test('getCartTotal calculates correctly with decimal prices', () => {
  const context = loadScriptsJS();
  context.cart = [
    { price: 10.50, quantity: 2 },
    { price: 5.25, quantity: 4 }
  ];
  const total = context.getCartTotal();
  // (10.50 * 2) + (5.25 * 4) = 21 + 21 = 42
  assert.strictEqual(total, 42);
});
