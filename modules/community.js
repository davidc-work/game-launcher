const axios = require('axios');
const url = 'http://localhost:3000';

const community = socket => {
    const get = name => {
        return new Promise(resolve => {
            socket.emit('get-community', name, answer => {
                resolve(answer);
            });
        });
    }

    return ({
        socket,
        get,
        getServer: (communityName, serverName) => {
            return new Promise(resolve => {
                socket.emit('get-server', { communityName, serverName }, answer => {
                    resolve(answer);
                });
            });
        },
        create: name => {
            return new Promise(resolve => {
                socket.emit('create-community', name, answer => {
                    resolve(answer);
                });
            });
        },
        createPublicServer: async (communityName, serverName) => {
            const com = await get(communityName, socket);
            if (com.data.exists) {

            } else console.error('Community does not exist!');
        },
        sendChat: async (msg, channel) => {
            return new Promise(resolve => {
                socket.emit('send-message', { msg, channel_id: channel._id }, answer => {
                    resolve(answer);
                });
            });
        },
        reset: () => {
            return new Promise(async resolve => {
                socket.emit('reset-communities', answer => {
                    resolve(answer);
                });
            });
        },
        joinChannel: channel_id => {
            return new Promise(async resolve => {
                socket.emit('join-channel', channel_id, answer => {
                    resolve(answer);
                });
            });
        }
    });
}

module.exports = community;