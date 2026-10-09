import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const { parse } = createRequire(import.meta.url)('@babel/parser');
for (const file of ['Hod/components/Header.jsx','Principal/components/Header.jsx','Accounts/components/Header.jsx','Coordinator/components/Navbar.jsx','Student/components/Navbar.jsx','Faculty/components/Navbar.jsx','Admin/components/Sidebar.jsx']) {
  test(file + ': delayed logout completion stays on Login for every logout handler', async () => {
    const source = readFileSync(new URL('../src/Pages/Dashboard/' + file, import.meta.url), 'utf8');
    const handlers = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'ArrowFunctionExpression' && node.async) {
        const text = source.slice(node.start, node.end);
        if (text.includes('await logout()') && text.includes('navigate(')) handlers.push(text);
      }
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    }
    visit(parse(source, { sourceType: 'module', plugins: ['jsx'] }));
    assert.ok(handlers.length);
    for (const text of handlers) {
      let resolve;
      const gate = new Promise(done => { resolve = done; });
      const navigations = [];
      const noop = () => {};
      const callback = vm.runInNewContext('(' + text + ')', {
        logout: () => gate, navigate: (path, options) => navigations.push([path, options?.replace]),
        toast: { success: noop, dismiss: noop }, handleClose: noop,
        setShowProfileMenu: noop, setIsProfileDropdownOpen: noop,
      });
      const pending = callback({ key: 'Enter', preventDefault: noop });
      assert.equal(navigations.length, 0);
      resolve(); await pending;
      assert.deepEqual(navigations, [['/login', true]]);
    }
  });
}
