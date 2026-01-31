// Example: How to use Prisma Client in your application
// Replace your existing database queries with Prisma Client

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Create a single instance of Prisma Client (reuse it across your app)
const prisma = new PrismaClient({
  // Optional: Log queries in development
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ============================================
// EXAMPLE 1: Get staff by username
// ============================================
async function getStaffByUsername(username) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { username: username },
    });
    return staff;
  } catch (error) {
    console.error('Error getting staff:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 2: Get staff by email
// ============================================
async function getStaffByEmail(email) {
  try {
    const staff = await prisma.staff.findUnique({
      where: { email: email },
    });
    return staff;
  } catch (error) {
    console.error('Error getting staff by email:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 3: Create a new staff member
// ============================================
async function createStaff(staffData) {
  try {
    const hashedPassword = await bcrypt.hash(staffData.password, 10);
    
    const staff = await prisma.staff.create({
      data: {
        username: staffData.username,
        password: hashedPassword,
        email: staffData.email,
        role: staffData.role,
        name: staffData.name,
        department: staffData.department,
        employee_id: staffData.employee_id,
        is_active: staffData.is_active ?? true,
      },
    });
    
    return staff;
  } catch (error) {
    console.error('Error creating staff:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 4: Update staff profile
// ============================================
async function updateStaffProfile(userId, updates) {
  try {
    const allowedFields = ['name', 'department', 'email'];
    const dataToUpdate = {};
    
    // Only include allowed fields
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        dataToUpdate[field] = updates[field];
      }
    }
    
    if (Object.keys(dataToUpdate).length === 0) {
      return null;
    }
    
    const staff = await prisma.staff.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
        email: true,
        created_at: true,
        last_login: true,
      },
    });
    
    return staff;
  } catch (error) {
    console.error('Error updating staff profile:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 5: Update last login
// ============================================
async function updateLastLogin(userId) {
  try {
    await prisma.staff.update({
      where: { id: userId },
      data: { last_login: new Date() },
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 6: Get all staff
// ============================================
async function getAllStaff() {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { id: 'asc' },
    });
    return staff;
  } catch (error) {
    console.error('Error getting all staff:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 7: Get staff by department
// ============================================
async function getStaffByDepartment(department) {
  try {
    const staff = await prisma.staff.findMany({
      where: {
        department: department,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
      },
    });
    return staff;
  } catch (error) {
    console.error('Error getting staff by department:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 8: Search staff by name
// ============================================
async function searchStaffByName(searchTerm) {
  try {
    const staff = await prisma.staff.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive', // Case-insensitive search
        },
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        department: true,
        role: true,
      },
    });
    return staff;
  } catch (error) {
    console.error('Error searching staff:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE 9: Get staff count by role
// ============================================
async function getStaffCountByRole() {
  try {
    const counts = await prisma.staff.groupBy({
      by: ['role'],
      where: {
        is_active: true,
      },
      _count: {
        id: true,
      },
    });
    
    return counts.map(item => ({
      role: item.role,
      count: item._count.id,
    }));
  } catch (error) {
    console.error('Error getting staff count by role:', error);
    throw error;
  }
}

// ============================================
// IMPORTANT: Always disconnect Prisma when done
// ============================================
// In serverless environments (Vercel), you typically don't need to disconnect
// as the function instance is reused. But for scripts or long-running processes:

async function cleanup() {
  await prisma.$disconnect();
}

// For graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Export the prisma client instance and functions
module.exports = {
  prisma,
  getStaffByUsername,
  getStaffByEmail,
  createStaff,
  updateStaffProfile,
  updateLastLogin,
  getAllStaff,
  getStaffByDepartment,
  searchStaffByName,
  getStaffCountByRole,
  cleanup,
};
