const pool = require('../config/database');

const dbUtils = {
  // Test database connection
  testConnection: async () => {
    try {
      const result = await pool.query(
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
      const result = await pool.query(query, [username]);
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
      const result = await pool.query(query, [email]);
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
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  },

  // Get all staff (for testing)
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
          password,
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
          password,
          is_active
        FROM staff
        WHERE username = $1
      `;
      const result = await pool.query(query, [username]);
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
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
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
      const result = await pool.query(query, [department]);
      return result.rows;
    } catch (error) {
      console.error('Error getting users by department:', error);
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
      const result = await pool.query(query, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
};

module.exports = dbUtils;