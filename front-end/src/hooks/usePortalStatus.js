import { useState, useEffect, useCallback, useMemo } from 'react';
import { portalAPI } from '../services/api';

const CACHE_KEY = 'portal_status_nptel_cache';
const CACHE_TTL = 30 * 1000; // 30 seconds cache

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // optional storage
  }
}

function getCurrentUserContext() {
  try {
    const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : {};
    const rawStudentProfile = localStorage.getItem('student_profile_settings');
    const studentProfile = rawStudentProfile ? JSON.parse(rawStudentProfile) : {};

    return {
      role: user.role || '',
      department: studentProfile.department || user.department || '',
      year: studentProfile.year || user.year || ''
    };
  } catch {
    return { role: '', department: '', year: '' };
  }
}

function checkIsClosedForUser(portalData, userContext) {
  if (!portalData || portalData.isOpen) {
    return false; // Open for everyone
  }

  const { role, department, year } = userContext;

  // 1. Role match
  const targetRoles = Array.isArray(portalData.targetRoles) && portalData.targetRoles.length > 0
    ? portalData.targetRoles
    : ['All'];

  if (!targetRoles.includes('All')) {
    if (!role || !targetRoles.some(r => r.toLowerCase() === role.toLowerCase())) {
      return false; // Not closed for this role
    }
  }

  // 2. Department match
  const targetDepartments = Array.isArray(portalData.targetDepartments) && portalData.targetDepartments.length > 0
    ? portalData.targetDepartments
    : ['All'];

  if (!targetDepartments.includes('All')) {
    if (!department || !targetDepartments.some(d => d.toLowerCase() === department.toLowerCase())) {
      return false; // Not closed for this department
    }
  }

  // 3. Year match (for Students)
  if (role && role.toLowerCase() === 'student' && year) {
    const targetYears = Array.isArray(portalData.targetYears) && portalData.targetYears.length > 0
      ? portalData.targetYears
      : ['All'];

    if (!targetYears.includes('All') && !targetYears.includes(year)) {
      return false; // Not closed for this academic year
    }
  }

  return true;
}

/**
 * Custom hook to monitor and control reimbursement portal status with role, dept, and year evaluation.
 */
export const usePortalStatus = (portalKey = 'nptel') => {
  const [portal, setPortal] = useState(() => getCached() || {
    isOpen: true,
    portalKey: 'nptel',
    title: 'NPTEL Certification',
    closedMessage: 'NPTEL Reimbursement Portal is currently closed for submissions.',
    targetRoles: ['All'],
    targetDepartments: ['All'],
    targetYears: ['All'],
    updatedBy: 'Admin'
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback((bustCache = false) => {
    if (!bustCache) {
      const cached = getCached();
      if (cached !== null) {
        setPortal(cached);
        return;
      }
    }

    setLoading(true);
    portalAPI.getStatus(portalKey)
      .then(res => {
        if (res?.success && res?.portal) {
          setPortal(res.portal);
          setCache(res.portal);
        }
      })
      .catch(() => {
        // Fallback default
      })
      .finally(() => setLoading(false));
  }, [portalKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStatus = useCallback(async (updateData) => {
    setLoading(true);
    try {
      const res = await portalAPI.updateStatus({
        portalKey,
        ...updateData
      });
      if (res?.success && res?.portal) {
        setPortal(res.portal);
        setCache(res.portal);
        return res.portal;
      }
      throw new Error(res?.error || 'Failed to update portal status');
    } finally {
      setLoading(false);
    }
  }, [portalKey]);

  const userContext = useMemo(() => getCurrentUserContext(), []);
  const isClosedForUser = useMemo(() => checkIsClosedForUser(portal, userContext), [portal, userContext]);

  return {
    portal,
    isPortalOpenGlobally: portal ? portal.isOpen !== false : true,
    isClosedForUser,
    isNptelOpen: !isClosedForUser,
    closedMessage: portal?.closedMessage || 'NPTEL Reimbursement Portal is currently closed for submissions.',
    loading,
    refresh,
    updateStatus
  };
};

export default usePortalStatus;
