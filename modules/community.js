const axios = require('axios');
const url = 'http://localhost:3000';

const get = async name => {
    const result = await axios.post(url + '/community/get/' + name);
    return result;
}

module.exports = {
    get,
    create: async name => {
        const result = await axios.post(url + '/community/create/' + name);
        return result;
    },
    createPublicServer: async (communityName, serverName) => {
        const com = await get(communityName);
        if (com.data.exists) {

        } else console.error('Community does not exist!');
    }
}