const fs = require('fs');
const path = require('path');
const urlFile = require('url-filea');

const shell = require('electron').shell;

let steamGames, allGames;
let selectedGame = {};

const getSteamGames = () => {
    let steamShortcutDir = 'C:\\Users\\r2dav\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Steam';
    let shortcuts = fs.readdirSync(steamShortcutDir);
    
    return shortcuts.map(s => {
        return ({
            name: s.split('.')[0],
            file: steamShortcutDir + '\\' + s
        });
    });
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
                shortcutPath: game.file,
                url: undefined
            };

            (async () => {
                await urlFile(game.file).then(data => {
                    selectedGame.url = data.url;
                    console.log(selectedGame);
                });
            })();
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