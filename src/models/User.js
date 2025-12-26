import mongoose from 'mongoose'; // Change from require

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: String,
    image: String,
    activationCode: Number,
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Change from module.exports to export default
export default mongoose.model('User', userSchema);