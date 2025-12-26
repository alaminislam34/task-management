import mongoose from 'mongoose'; // Change from require

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    creator_email: { type: String, required: true }
}, { timestamps: true });

// Change from module.exports to export default
export default mongoose.model('Task', taskSchema);