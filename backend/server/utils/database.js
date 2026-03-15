const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

// Helper to check if pool is initialized
function ensurePool() {
  if (!pool) {
    throw new Error('PostgreSQL pool not initialized. Check DATABASE_URL environment variable in Vercel settings.');
  }
  return pool;
}

const dbUtils = {
  // Test database connection
  testConnection: async () => {
    try {
      if (!pool) {
        return {
          success: false,
          error: 'PostgreSQL pool not initialized. Check DATABASE_URL environment variable.'
        };
      }
      const dbPool = ensurePool();
      const result = await dbPool.query(
        'SELECT NOW()'
      );
      return { success: true, timestamp: result.rows[0].now };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get staff by username
  getStaffByUsername: async (username) => {
    try {
      const dbPool = ensurePool();
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role,
          email,
          password,
          created_at,
          last_login,
          is_active
        FROM staff
        WHERE username = $1
      `;
      const result = await dbPool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  // Get staff by email
  getStaffByEmail: async (email) => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role,
          email,
          password,
          created_at,
          last_login,
          is_active
        FROM staff
        WHERE email = $1
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  },

  // Update last login time
  updateLastLogin: async (userId) => {
    try {
      const query = `
        UPDATE staff
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      const dbPool = ensurePool();
      await dbPool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  },

  // Get all staff (excludes password for security)
  getAllStaff: async () => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role,
          email,
          created_at,
          last_login,
          is_active
        FROM staff
        ORDER BY id ASC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  },

  // Get staff for login
  getStaffForLogin: async (username) => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role,
          email,
          password,
          is_active
        FROM staff
        WHERE username = $1
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user for login:', error);
      throw error;
    }
  },

  // Get staff profile (public data only)
  getStaffProfile: async (userId) => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role,
          email,
          created_at,
          last_login
        FROM staff
        WHERE id = $1 AND is_active = true
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Update staff profile (limited editable fields)
  updateStaffProfile: async (userId, updates) => {
    try {
      const allowed = ['name', 'department', 'email'];
      const fields = allowed.filter((k) => updates[k] !== undefined);

      if (fields.length === 0) {
        return null;
      }

      const setClauses = fields.map((field, idx) => `${field} = $${idx + 2}`);
      const values = fields.map((field) => updates[field]);

      const query = `
        UPDATE staff
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING 
        id, 
        username, 
        name, 
        department, 
        role, 
        email, 
        created_at, 
        last_login
      `;

      const dbPool = ensurePool();
      const result = await dbPool.query(query, [userId, ...values]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Get staff by department (public data only)
  getStaffByDepartment: async (department) => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role
        FROM staff
        WHERE department = $1
        AND is_active = true
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [department]);
      return result.rows;
    } catch (error) {
      console.error('Error getting users by department:', error);
      throw error;
    }
  },

  // Get single staff member by ID (admin use)
  getStaffById: async (id) => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role,
          email,
          employee_id,
          is_active,
          created_at,
          last_login
        FROM staff
        WHERE id = $1
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting staff by ID:', error);
      throw error;
    }
  },

  // Update staff by ID (admin controlled)
  updateStaffById: async (id, updates) => {
    try {
      const allowed = ['username', 'name', 'email', 'role', 'department', 'employee_id', 'is_active', 'password'];
      const fields = allowed.filter((k) => updates[k] !== undefined);

      if (fields.length === 0) {
        return null;
      }

      const setClauses = fields.map((field, idx) => `${field} = $${idx + 2}`);
      const values = [];
      for (const field of fields) {
        if (field === 'password') {
          const passwordValue = String(updates[field]);
          if (BCRYPT_HASH_PATTERN.test(passwordValue)) {
            values.push(passwordValue);
          } else {
            values.push(await bcrypt.hash(passwordValue, 10));
          }
        } else {
          values.push(updates[field]);
        }
      }

      const query = `
        UPDATE staff
        SET ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING
          id,
          username,
          name,
          department,
          role,
          email,
          employee_id,
          is_active,
          created_at,
          last_login
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [id, ...values]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating staff by ID:', error);
      throw error;
    }
  },

  // Get staff count by role
  getStaffCountByRole: async () => {
    try {
      const query = `
        SELECT
          role,
          COUNT(*) as count
        FROM staff
        WHERE is_active = true
        GROUP BY role
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting user count by role:', error);
      throw error;
    }
  },

  // Search staff by name
  searchStaffByName: async (searchTerm) => {
    try {
      const query = `
        SELECT
          id,
          username,
          name,
          department,
          role
        FROM staff
        WHERE name ILIKE $1
        AND is_active = true
      `;
      const dbPool = ensurePool();
      const result = await dbPool.query(query, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
};

// Add aliases for backward compatibility (after dbUtils is defined)
dbUtils.getAllUsers = dbUtils.getAllStaff;
dbUtils.getUserForLogin = dbUtils.getStaffForLogin;

module.exports = dbUtils;