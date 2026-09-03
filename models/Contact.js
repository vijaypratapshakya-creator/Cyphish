import mongoose from 'mongoose';
const { Schema } = mongoose;

const contactSchema = new Schema({
    username: {
        type: String,
        trim: true,
        default: '',
    },
    firstName: {
        type: String,
        required: [true, 'First Name is required'],
        trim: true
    },
    lastName: {
        type: String,
        trim: true,
        default: '',
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Please fill a valid email address']
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: '',
    },
    role: {
        type: String,
        trim: true,
        default: '',
    },
    country: {
        type: String,
        trim: true,
        default: '',
    },
    company: {
        type: String,
        trim: true,
        default: '',
    },
    department: { 
        type: String, 
        trim: true, 
        default: 'General' 
    },
    ou: {
        type: String,
        trim: true,
        default: '',
    },
    teamName: {
        type: String,
        trim: true,
        default: '',
    },
    directoryDn: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    directoryGroups: { 
        type: [String], 
        default: [] 
    },
    source: { 
        type: String, 
        enum: ['manual', 'csv', 'ldap'], 
        default: 'manual' 
    },
    metadata: {
        type: Map,
        of: Schema.Types.Mixed,
        default: new Map()
    }
}, { timestamps: true });

contactSchema.index({ email: 1 });
contactSchema.index({ department: 1 });
contactSchema.index({ ou: 1 });

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
