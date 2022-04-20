const axios = require('axios');
const url = 'http://localhost:3000';

// const get = async name => {
//     const result = await axios.post(url + '/community/get/' + name);
//     return result;
// }

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
            // return new Promise(async resolve => {
            //     const server = await axios.post(url + '/community/get-server/' + communityName + '/' + serverName);
            //     resolve(server.data);
            // });
        },
        create: name => {
            return new Promise(resolve => {
                socket.emit('create-community', name, answer => {
                    resolve(answer);
                });
            });
            /*const result = await axios.post(url + '/community/create/' + name);
            return result;*/
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
            // const result = await axios.post(`${url}/community/sendchat/`, {
            //     msg,
            //     channel_id: channel._id
            // });
            // return result;
        },
        reset: () => {
            return new Promise(async resolve => {
                socket.emit('reset-communities', answer => {
                    resolve(answer);
                });
            });
            // return new Promise(async resolve => {
            //     const response = await axios.post(`${url}/community/reset`);
            //     resolve(response.data);
            // });
        }
    });
}

module.exports = community;