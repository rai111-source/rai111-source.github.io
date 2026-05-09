const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Helper to load the supabase.js file into a context
function loadSupabaseJS(mocks = {}) {
  const code = fs.readFileSync(path.join(__dirname, '../js/supabase.js'), 'utf8');
  const context = {
    supabase: {
      createClient: () => mocks.supabaseClient || {}
    },
    window: { ENV: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'test-key' } },
    console: mocks.console || console,
    ...mocks.globals
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

test('getProducts returns data on success', async () => {
  const mockData = [{ id: 1, name: 'Product 1' }];
  const mockQuery = {
    eq: function() { return this; },
    order: function() { return this; },
    then: function(resolve) {
      return Promise.resolve({ data: mockData, error: null }).then(resolve);
    }
  };

  const mockSupabaseClient = {
    from: () => ({
      select: () => mockQuery
    })
  };

  const context = loadSupabaseJS({ supabaseClient: mockSupabaseClient });
  const result = await context.getProducts();

  assert.deepStrictEqual(result, mockData);
});

test('getProducts handles error and returns empty array', async () => {
  const mockError = { message: 'Database error' };
  let loggedError = null;

  const mockConsole = {
    error: (...args) => {
      loggedError = args;
    },
    log: console.log
  };

  const mockQuery = {
    eq: function() { return this; },
    order: function() { return this; },
    then: function(resolve) {
      return Promise.resolve({ data: null, error: mockError }).then(resolve);
    }
  };

  const mockSupabaseClient = {
    from: () => ({
      select: () => mockQuery
    })
  };

  const context = loadSupabaseJS({
    supabaseClient: mockSupabaseClient,
    console: mockConsole
  });

  const result = await context.getProducts();

  assert.strictEqual(result.length, 0);
  assert.ok(Array.isArray(result));
  assert.ok(loggedError, 'Error should be logged to console');
  assert.strictEqual(loggedError[0], 'getProducts:');
  assert.deepStrictEqual(loggedError[1], mockError);
});
