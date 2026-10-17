const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true, maxlength: 12000 }
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New conversation', maxlength: 120 },
  messages: { type: [messageSchema], default: [] }
}, { timestamps: true });

conversationSchema.index({ user: 1, updatedAt: -1 });
module.exports = mongoose.model('AIConversation', conversationSchema);
