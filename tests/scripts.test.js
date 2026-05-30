const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

// Mock window object
const windowMock = {
    escapeHtml: function(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
};
const context = vm.createContext({
    window: windowMock,
    document: {
        addEventListener: () => {},
        querySelectorAll: () => [],
        getElementById: () => null,
        querySelector: () => null
    },
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    JSON: JSON
});

// Load the script
const scriptCode = fs.readFileSync('js/scripts.js', 'utf8');
vm.runInContext(scriptCode, context);

test('getCartTotal calculates correct total for multiple items', () => {
    const cart = [
        { price: 10, quantity: 2 },
        { price: 5, quantity: 4 }
    ];
    assert.strictEqual(windowMock.getCartTotal(cart), 40);
});

test('getCartTotal returns 0 for empty cart', () => {
    const cart = [];
    assert.strictEqual(windowMock.getCartTotal(cart), 0);
});

test('getCartTotal handles missing quantity correctly (if price is numeric)', () => {
    const cart = [
        { price: 10, quantity: 0 }
    ];
    assert.strictEqual(windowMock.getCartTotal(cart), 0);
});

test('getCartTotal handles undefined cart', () => {
    assert.strictEqual(windowMock.getCartTotal(undefined), 0);
});
