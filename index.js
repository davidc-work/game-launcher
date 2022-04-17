const fs = require('fs');
const path = require('path');
const urlFile = require('url-filea');

const shell = require('electron').shell;
const VDF = require('@node-steam/vdf');

let steamGames, allGames;
let selectedGame = {};

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
    const libraryFoldersListPath = 'C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf';
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
    console.log(steamGames);
    allGames = steamGames.sort((a, b) => a.name.localeCompare(b.name));
}

const populateGamesList = () => {
    updateGamesList();

    const sidebarElement = $('#game-sidebar');

    allGames.forEach(game => {
        var e = $('<div>').addClass('game-sidebar-list-element').click(function () {
            $('.game-sidebar-list-element').removeClass('selected');
            $(this).addClass('selected');

            let gameName = this.children[0].innerText;
            let game = allGames.find(g => g.name == gameName);

            selectedGame = {
                name: game.name,
                url: 'steam://rungameid/' + game.appid
            };

            console.log(selectedGame);
        });
        $('<p>').text(game.name).appendTo(e);

        sidebarElement.append(e);
    });
}

const playSelectedGame = () => {
    if (selectedGame.url) {
        shell.openExternal(selectedGame.url);
    }
}

$(document).ready(populateGamesList);