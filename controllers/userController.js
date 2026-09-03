import userService from '../services/userService.js';
import User from '../models/User.js';
import { audit } from '../services/auditService.js';

// Utility to sanitize user output (never expose password or sensitive fields)
function sanitizeUser(user) {
  if (!user) return null;
  const { password, __v, ...safe } = user.toObject ? user.toObject() : user;
  return safe;
}

// Get current user (authenticated user only)
export async function getMe(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const user = await userService.findUserById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Update current user
export async function updateMe(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const allowlist = ['firstName', 'lastName', 'email'];
    const payload = {};
    for (const key of allowlist) {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    }
    const user = await userService.updateUser(req.user._id, payload);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email already in use' });
    }
    res.status(400).json({ success: false, error: err.message });
  }
}

// Change password for current user
export async function changePassword(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }
    const user = await userService.findUserById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();

    await audit({
      req,
      action: 'USER_PASSWORD_CHANGED',
      resourceType: 'User',
      resourceId: user._id,
      details: { username: user.username },
    });

    res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// List all users (Admin only)
export async function listUsers(req, res) {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Create new delegated user / engineer (Admin only)
export async function createUser(req, res) {
  try {
    const { firstName, lastName, username, email, password, role } = req.body;
    if (!username || !password || !firstName) {
      return res.status(400).json({ success: false, error: 'First name, username, and password are required.' });
    }

    const validRoles = ['admin', 'campaign_manager', 'viewer'];
    const assignedRole = validRoles.includes(role) ? role : 'campaign_manager';

    const existing = await User.findOne({
      $or: [{ username: username.trim() }, { email: email?.trim().toLowerCase() }],
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'A user with this username or email already exists.' });
    }

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
      username: username.trim(),
      email: email?.trim().toLowerCase() || `${username.trim()}@cyphish.local`,
      password,
      role: assignedRole,
      accountLocked: false,
      isRoot: false,
    });

    await newUser.save();

    await audit({
      req,
      action: 'USER_CREATED',
      resourceType: 'User',
      resourceId: newUser._id,
      details: { username: newUser.username, role: newUser.role },
    });

    res.status(201).json({ success: true, message: `User ${newUser.username} created successfully as ${newUser.role}.`, data: sanitizeUser(newUser) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// Update user details & role (Admin only)
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, password } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (firstName) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (email) user.email = email.trim().toLowerCase();
    
    if (role && !user.isRoot) {
      const validRoles = ['admin', 'campaign_manager', 'viewer'];
      if (validRoles.includes(role)) {
        user.role = role;
      }
    }

    if (password && password.trim().length >= 6) {
      user.password = password.trim();
    }

    await user.save();

    await audit({
      req,
      action: 'USER_UPDATED',
      resourceType: 'User',
      resourceId: user._id,
      details: { username: user.username, role: user.role },
    });

    res.json({ success: true, message: 'User updated successfully', data: sanitizeUser(user) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

// Toggle account lock (Admin only)
export async function toggleLockUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.isRoot) {
      return res.status(400).json({ success: false, error: 'The primary root administrator cannot be locked.' });
    }

    user.accountLocked = !user.accountLocked;
    await user.save();

    await audit({
      req,
      action: user.accountLocked ? 'USER_LOCKED' : 'USER_UNLOCKED',
      resourceType: 'User',
      resourceId: user._id,
      details: { username: user.username, accountLocked: user.accountLocked },
    });

    res.json({
      success: true,
      message: `User ${user.username} is now ${user.accountLocked ? 'locked' : 'unlocked'}.`,
      accountLocked: user.accountLocked,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Delete user (Admin only)
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.isRoot) {
      return res.status(400).json({ success: false, error: 'The primary root administrator cannot be deleted.' });
    }

    if (req.user && req.user._id === id) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own active administrator account.' });
    }

    await User.findByIdAndDelete(id);

    await audit({
      req,
      action: 'USER_DELETED',
      resourceType: 'User',
      resourceId: id,
      details: { username: user.username },
    });

    res.json({ success: true, message: `User ${user.username} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get user by username
export async function getUserByUsername(req, res) {
  try {
    const user = await userService.findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get user by email
export async function getUserByEmail(req, res) {
  try {
    const user = await userService.findUserByEmail(req.params.email);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Check if root admin exists
export async function checkRootAdmin(req, res) {
  try {
    const rootAdmin = await userService.findRootAdmin();
    res.json({ success: true, data: { exists: !!rootAdmin } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

const userController = {
  getMe,
  updateMe,
  changePassword,
  listUsers,
  createUser,
  getUserByUsername,
  getUserByEmail,
  updateUser,
  toggleLockUser,
  deleteUser,
  checkRootAdmin,
};

export default userController;
