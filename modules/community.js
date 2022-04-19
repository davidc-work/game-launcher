const axios = require('axios');
const url = 'http://localhost:3000';

const get = async name => {
    const result = await axios.post(url + '/community/get/' + name);
    return result;
}

module.exports = {
    get,
    getServer: (communityName, serverName) => {
        return new Promise(async resolve => {
            const server = await axios.post(url + '/community/get-server/' + communityName + '/' + serverName);
            resolve(server.data);
        });
    },
    create: async name => {
        const result = await axios.post(url + '/community/create/' + name);
        return result;
    },
    createPublicServer: async (communityName, serverName) => {
        const com = await get(communityName);
        if (com.data.exists) {

        } else console.error('Community does not exist!');
    },
    sendChat: async (msg, community, server, channel) => {
        const com = await get(community);
        if (com.data.exists) {
            const result = await axios.post(`${url}/community/${community}/sendchat/`, {
                msg, server, channel
            });
            return result;
        } else console.error('Community does not exist!');

        return;
    },
    reset: () => {
        return new Promise(async resolve => {
            const response = await axios.post(`${url}/community/reset`);
            resolve(response.data);
        });
    }
}