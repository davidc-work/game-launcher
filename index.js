const fs = require('fs');
const path = require('path');
const urlFile = require('url-filea');

const shell = require('electron').shell;
const VDF = require('@node-steam/vdf');

let steamInstallDir;

let steamGames, allGames;
let com, selectedPublicServer, selectedChannel;
let selectedGame = {};

const socket = io('http://127.0.0.1:3001');
socket.on('connect', () => {
    console.log('connected');
});

const community = require('./modules/community')(socket);

const parseACF = acf => {
    const spl = acf.split('"').reduce((a, b, i) => {
        if (i % 2) a.push(b);

        return a;
    }, []);

    const a = spl.findIndex(e => e == 'InstalledDepots'), b = spl.findIndex(e => e == 'UserConfig');
    spl.splice(a, b - a + 1);

    let result = {};

    spl.splice(0, 1);
    while (spl.length) {
        result[spl[0]] = spl[1];
        spl.splice(0, 2);
    }

    return result;
}

const getSteamGames = () => {
    const libraryFoldersListPath = steamInstallDir + '\\steamapps\\libraryfolders.vdf';
    const vdf = fs.readFileSync(libraryFoldersListPath).toString();

    const folders = VDF.parse(vdf).libraryfolders;

    let i = 0, games = [];
    while (folders[i]) {
        let p = folders[i].path.replaceAll('\\\\', '\\') + '\\steamapps\\common';
        const gameDirectories = fs.readdirSync(p, { withFileTypes: true }).filter(file => file.isDirectory()).map(file => p + '\\' + file.name);

        gameDirectories.forEach(game => {
            games.push({
                name: path.basename(game),
                fullPath: game,
            });
        });

        p = folders[i].path.replaceAll('\\\\', '\\') + '\\steamapps';
        const files = fs.readdirSync(p).toString().split(',');

        files.forEach(file => {
            if (file.slice(0, 11) == 'appmanifest') {
                const fullPath = p + '\\' + file;
                const manifest = fs.readFileSync(fullPath).toString();

                let parsedManifest = parseACF(manifest);
                parsedManifest.fullPath = p + '\\common\\' + parsedManifest.installdir;

                const targetGame = games.find(game => game.fullPath == parsedManifest.fullPath);
                targetGame.appid = parsedManifest.appid;
            }
        });

        i++;
    }

    return games;
}

const updateGamesList = () => {
    steamGames = getSteamGames();
    allGames = steamGames.sort((a, b) => a.name.localeCompare(b.name));
}

const toggleCommunityExists = exists => {
    if (exists) {
        $('#create-community-button').removeClass('visible');
        $('#community-container').addClass('visible');
    } else {
        $('#create-community-button').addClass('visible');
        $('#community-container').removeClass('visible');
    }
}

const toggleCommunityPage = mode => {
    const content = {
        main: {
            sidebar: 'main-community-content',
            display: 'temp'
        },
        server: {
            sidebar: 'server-content',
            display: 'server-chat-all'
        }
    }

    const c = content[mode];

    $('#community-sidebar>*, #community-display>*').removeClass('visible');
    $('#' + c.sidebar + ', ' + '#' + c.display).addClass('visible');
}

const createPublicServer = () => community.createPublicServer(selectedGame.communityName);

const setCommunity = communityName => {
    return new Promise(async resolve => {
        com = await updateCommunity(communityName);
        toggleCommunityPage('main');
        resolve();
    });
}

const updateCommunity = communityName => {
    return new Promise(resolve => {
        (async () => {
            const result = await community.get(communityName);
            console.log(result);

            toggleCommunityExists(result.exists);

            resolve(result);
        })();
    });
}

const routeCommunityHome = () => {
    return new Promise(resolve => {
        if (!com.exists) resolve();

        selectedPublicServer = undefined;
        selectedChannel = undefined;

        $('#public-servers-list').html('');
        com.publicServers.forEach(server => {
            const e = $('<div>').addClass('server-list-element');
            e.append($('<p>').text(server.name));
            e.click(() => {
                routeCommunityServer(server.name);
            });
            $('#public-servers-list').append(e);
        });

        resolve();
    });
}

const reset = async () => {
    const res = await community.reset();
    console.log(res);
}

const routeCommunityServer = serverName => {
    $('#community-display .chat').html('');
    return new Promise(async resolve => {
        if (!com.exists) resolve();

        let serverData;
        if (serverData = com.publicServers.find(server => server.name == serverName)) {
            selectedPublicServer = serverData;

            toggleCommunityPage('server');

            const server = await community.getServer(com.name, serverData.name);

            $('#channel-list').html('');
            server.channels.forEach(channel => {
                const e = $('<div>').addClass('channel-list-item btn btn-sidebar');
                e.append($('<p>').text(channel.name));
                e.click(() => selectChannel(server, channel.name));
                $('#channel-list').append(e);
            });

            selectChannel(server, 'main');
        }

        resolve();
    });
}

const selectChannel = (server, channelName) => {
    $('#community-display .chat').html('');
    const channel = server.channels.find(channel => channel.name == channelName);
    selectedChannel = channel;

    const chat = channel.chat;

    if (!chat) return;

    $('.channel-list-item').removeClass('selected');
    $($('.channel-list-item').toArray().find(e => e.children[0].innerText == channelName)).addClass('selected');

    chat.messages.forEach(message => {
        const e = $('<div>').addClass('chat-msg');
        e.append($('<p>').text(message.user));
        e.append($('<p>').text(message.msg));
        $('#community-display .chat').append(e)
    });
}

const selectGame = async game => {
    //let game = allGames.find(g => g.name == gameName);

    const listElements = $('.game-sidebar-list-element').toArray();
    const selectedElement = listElements.find(e => e.children[0].innerText == game.name);

    $('.game-sidebar-list-element').removeClass('selected');
    $(selectedElement).addClass('selected');

    selectedGame = {
        name: game.name,
        url: 'steam://rungameid/' + game.appid,
        communityName: game.name.toLowerCase().replaceAll(' ', '')
    };

    $('#header-text-container > p').text(game.name);

    await setCommunity(selectedGame.communityName);

    await routeCommunityHome();
}

const createCommunity = async () => {
    const result = await community.create(selectedGame.communityName);
    toggleCommunityExists(result.success);

    console.log(result);
}

const populateGamesList = () => {
    updateGamesList();

    const sidebarElement = $('#game-sidebar');

    allGames.forEach(game => {
        var e = $('<div>').addClass('game-sidebar-list-element').click(function () { selectGame(game) });
        $('<p>').text(game.name).appendTo(e);

        sidebarElement.append(e);
    });

    selectGame(allGames[0]);
}

const playSelectedGame = () => {
    if (selectedGame.url) {
        shell.openExternal(selectedGame.url);
    }
}

const sendChat = community.sendChat;

$(document).ready(() => {
    feather.replace({ color: 'white' });

    require('fetch-installed-software').getAllInstalledSoftware().then(programs => {
        const steamInfo = programs.find(program => program.RegistryDirName == 'Steam');
        steamInstallDir = steamInfo.DisplayIcon.slice(0, steamInfo.DisplayIcon.lastIndexOf('\\'));

        populateGamesList();
    });

    $('.chat-box > input').on('keyup', async e => {
        if (e.key == 'Enter') {
            console.log(com);
            const result = await sendChat(e.target.value, selectedChannel, socket);
            console.log(result);
            e.target.value = '';
        }
    });
});