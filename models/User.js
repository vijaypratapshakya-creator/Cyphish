import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, default: '' },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // hashed
  role: { 
    type: String, 
    enum: ['admin', 'campaign_manager', 'viewer', 'user'], 
    default: 'campaign_manager' 
  },
  accountLocked: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastFailedLoginAt: { type: Date },
  isRoot: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Password comparison method
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);
export default User;