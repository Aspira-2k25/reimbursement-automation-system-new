const test = require('node:test');
const assert = require('node:assert/strict');
const { getPortalStatus, updatePortalStatus, isPortalClosedForUser, getAvailablePortals } = require('../utils/portalManager');

test('portalManager defaults to open with expected structure', async () => {
  const status = await getPortalStatus('nptel');
  assert.equal(typeof status.isOpen, 'boolean');
  assert.equal(status.portalKey, 'nptel');
  assert.ok(Array.isArray(getAvailablePortals()));
});

test('Admin can close and reopen the NPTEL portal with granular options', async () => {
  const closed = await updatePortalStatus('nptel', {
    isOpen: false,
    closedMessage: 'NPTEL submissions temporarily closed for maintenance.',
    targetRoles: ['Student'],
    targetDepartments: ['Computer Engineering'],
    targetYears: ['SE']
  }, { name: 'Admin Staff', role: 'Admin' });

  assert.equal(closed.isOpen, false);
  assert.equal(closed.closedMessage, 'NPTEL submissions temporarily closed for maintenance.');
  assert.equal(closed.updatedBy, 'Admin Staff');
  assert.deepEqual(closed.targetRoles, ['Student']);
  assert.deepEqual(closed.targetDepartments, ['Computer Engineering']);
  assert.deepEqual(closed.targetYears, ['SE']);

  // Check matching user (Student, Computer Engineering, SE) -> closed
  const isClosedForTarget = isPortalClosedForUser(closed, {
    role: 'Student',
    department: 'Computer Engineering',
    year: 'SE'
  });
  assert.equal(isClosedForTarget, true);

  // Check Faculty in same department -> NOT closed (targetRoles was Student)
  const isClosedForFaculty = isPortalClosedForUser(closed, {
    role: 'Faculty',
    department: 'Computer Engineering'
  });
  assert.equal(isClosedForFaculty, false);

  // Check Student in different department -> NOT closed
  const isClosedForDifferentDept = isPortalClosedForUser(closed, {
    role: 'Student',
    department: 'Information Technology',
    year: 'SE'
  });
  assert.equal(isClosedForDifferentDept, false);

  // Check Student in different year -> NOT closed
  const isClosedForDifferentYear = isPortalClosedForUser(closed, {
    role: 'Student',
    department: 'Computer Engineering',
    year: 'TE'
  });
  assert.equal(isClosedForDifferentYear, false);

  // Reopen portal
  const reopened = await updatePortalStatus('nptel', {
    isOpen: true,
    targetRoles: ['All'],
    targetDepartments: ['All'],
    targetYears: ['All']
  }, { name: 'Admin Staff', role: 'Admin' });

  assert.equal(reopened.isOpen, true);
  assert.equal(isPortalClosedForUser(reopened, { role: 'Student', department: 'Computer Engineering', year: 'SE' }), false);
});
