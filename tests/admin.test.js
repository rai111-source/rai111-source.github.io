const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function runAdminJS(mocks = {}) {
  let code = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
  
  // Expose local helper functions to window for testing by injecting them right before the closing of DOMContentLoaded
  const lastIndex = code.lastIndexOf('});');
  if (lastIndex !== -1) {
    code = code.substring(0, lastIndex) + 
      '\n    window.escapeHtml = escapeHtml;\n    window.getStoragePathFromUrl = getStoragePathFromUrl;\n' + 
      code.substring(lastIndex);
  }

  const mockElement = {
    addEventListener: () => {},
    querySelector: () => ({}),
    style: {},
    classList: { add: () => {}, remove: () => {} }
  };
  
  const docListeners = {};
  
  const mockDocument = {
    addEventListener: (event, cb) => {
      docListeners[event] = cb;
    },
    getElementById: (id) => {
      if (mocks.elements && mocks.elements[id]) {
        return mocks.elements[id];
      }
      return mockElement;
    },
    querySelectorAll: () => []
  };

  const mockLocation = { href: '' };
  
  // A robust chainable query builder mock for Supabase
  const queryMock = {};
  queryMock.select = () => queryMock;
  queryMock.order = () => queryMock;
  queryMock.eq = () => queryMock;
  queryMock.limit = () => queryMock;
  queryMock.delete = () => queryMock;
  queryMock.update = () => queryMock;
  queryMock.single = () => queryMock;
  queryMock.then = (resolve) => {
    return Promise.resolve({ data: mocks.dbData || [], error: null }).then(resolve);
  };

  const channelMock = {
    on: () => channelMock,
    subscribe: () => channelMock,
    unsubscribe: () => {}
  };

  const windowMock = {
    supabaseClient: mocks.supabaseClient || {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null })
      },
      from: () => queryMock,
      channel: () => channelMock
    },
    location: mockLocation,
    alert: () => {},
    confirm: () => true,
    escHtml: (str) => {
      if (!str && str !== 0) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },
    ...mocks.globals
  };

  const context = {
    window: windowMock,
    document: mockDocument,
    console: mocks.console || console,
    setTimeout: setTimeout,
    ...mocks.globals
  };

  vm.createContext(context);
  vm.runInContext(code, context);
  
  return { context, docListeners, windowMock };
}

function getAdminSessionMock(tablesData = {}) {
  const mockSession = {
    user: { email: 'raj@littlelayers.in' }
  };
  const channelMock = {
    on: () => channelMock,
    subscribe: () => channelMock,
    unsubscribe: () => {}
  };
  return {
    auth: {
      getSession: async () => ({ data: { session: mockSession }, error: null })
    },
    from: (tableName) => {
      const queryMock = {};
      queryMock.select = () => queryMock;
      queryMock.order = () => queryMock;
      queryMock.eq = () => queryMock;
      queryMock.limit = () => queryMock;
      queryMock.then = (resolve) => {
        const data = tablesData[tableName] || [];
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return queryMock;
    },
    channel: () => channelMock
  };
}

test('admin.js registers global hooks when DOMContentLoaded fires', async () => {
  const { docListeners, windowMock } = runAdminJS({
    supabaseClient: getAdminSessionMock(),
    console: { log: () => {}, error: () => {} }
  });
  
  // Trigger DOMContentLoaded
  if (docListeners['DOMContentLoaded']) {
    await docListeners['DOMContentLoaded']();
  }

  // Verify functions are exported to window
  assert.strictEqual(typeof windowMock.updateOrderStatus, 'function');
});

test('admin.js redirects to login.html if session does not exist', async () => {
  const { docListeners, windowMock } = runAdminJS({
    console: { log: () => {}, error: () => {} }
  });
  
  if (docListeners['DOMContentLoaded']) {
    await docListeners['DOMContentLoaded']();
  }

  assert.strictEqual(windowMock.location.href, 'login.html');
});

test('admin.js escapeHtml properly escapes HTML special characters', async () => {
  const { docListeners, windowMock } = runAdminJS({
    supabaseClient: getAdminSessionMock(),
    console: { log: () => {}, error: () => {} }
  });

  if (docListeners['DOMContentLoaded']) {
    await docListeners['DOMContentLoaded']();
  }

  const escapeHtml = windowMock.escapeHtml;
  assert.strictEqual(typeof escapeHtml, 'function');

  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(escapeHtml('Hello & Welcome'), 'Hello &amp; Welcome');
  assert.strictEqual(escapeHtml("John's Pizza"), 'John&#039;s Pizza');
  assert.strictEqual(escapeHtml(''), '');
  assert.strictEqual(escapeHtml(null), '');
});

test('admin.js getStoragePathFromUrl extracts correct paths', async () => {
  const { docListeners, windowMock } = runAdminJS({
    supabaseClient: getAdminSessionMock(),
    console: { log: () => {}, error: () => {} }
  });

  if (docListeners['DOMContentLoaded']) {
    await docListeners['DOMContentLoaded']();
  }

  const getStoragePathFromUrl = windowMock.getStoragePathFromUrl;
  assert.strictEqual(typeof getStoragePathFromUrl, 'function');

  const testUrl = 'https://xyz.supabase.co/storage/v1/object/public/products/subfolder/image.png';
  const pathPart = getStoragePathFromUrl(testUrl, 'products');
  assert.strictEqual(pathPart, 'subfolder/image.png');

  const invalidUrl = 'https://xyz.supabase.co/storage/v1/object/public/otherbucket/subfolder/image.png';
  assert.strictEqual(getStoragePathFromUrl(invalidUrl, 'products'), null);
  assert.strictEqual(getStoragePathFromUrl('', 'products'), null);
});

test('admin.js loadOrders renders order items correctly', async () => {
  const mockOrders = [
    {
      id: '123',
      order_ref: 'LL-111111',
      created_at: '2026-06-07T12:00:00Z',
      items: [
        { name: 'Photo Frame 10x12', qty: 2 }
      ],
      total: 1500,
      status: 'pending'
    }
  ];
  
  const ordersListMock = {
    innerHTML: '',
    style: {}
  };
  
  const { docListeners } = runAdminJS({
    supabaseClient: getAdminSessionMock({ orders: mockOrders }),
    elements: {
      'admin-orders-list': ordersListMock
    }
  });

  if (docListeners['DOMContentLoaded']) {
    await docListeners['DOMContentLoaded']();
  }

  // Wait for the async loadOrders() query/rendering to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  assert.ok(ordersListMock.innerHTML.includes('LL-111111'));
  assert.ok(ordersListMock.innerHTML.includes('Photo Frame 10x12'));
  assert.ok(ordersListMock.innerHTML.includes('(x2)'));
  assert.ok(ordersListMock.innerHTML.includes('₹1,500'));
});
