const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    sessionID: String,
    data: String
});
const Session = mongoose.model('Session', SessionSchema);

const useMongoDBAuthState = async (sessionID) => {
    const writeData = async (data, id) => {
        const str = JSON.stringify(data);
        await Session.findOneAndUpdate({ sessionID: id }, { data: str }, { upsert: true });
    };

    const readData = async (id) => {
        const rs = await Session.findOne({ sessionID: id });
        return rs ? JSON.parse(rs.data) : null;
    };

    let creds = await readData(sessionID) || require('@whiskeysockets/baileys').BufferJSON.reviver;

    return {
        state: {
            creds: creds || (await require('@whiskeysockets/baileys').initAuthState()).creds,
            keys: {
                get: async (type, ids) => { /* logic for keys storage */ },
                set: async (data) => { /* logic for keys storage */ }
            }
        },
        saveCreds: async () => {
            await writeData(creds, sessionID);
        }
    };
};
module.exports = { useMongoDBAuthState };