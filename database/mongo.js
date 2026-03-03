const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    data: { type: String, required: true }
});

const GroupSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    antilink: { type: String, default: 'off' }, // off, warn, remove, delete
    antimedia: { type: Boolean, default: false },
    antiscam: { type: Boolean, default: false },
    antiporno: { type: Boolean, default: false },
    antispam: { type: Boolean, default: false },
    scamWords: { type: Array, default: [] }
});

const Session = mongoose.model('Session', SessionSchema);
const Group = mongoose.model('Group', GroupSchema);

module.exports = { Session, Group };
