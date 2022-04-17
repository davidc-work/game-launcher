const fs = require('fs');
const path = require('path');
const exec = require('child_process').execFile;

const VDF = require('@node-steam/vdf');

let steamGames, allGames;
let selectedGame = {};

const getExes = (filePath, depth = 8) => {
    if (--depth == 0) return [];
    const files = []
    for (const file of fs.readdirSync(filePath)) {
        const fullPath = filePath + '\\' + file
        if(fs.lstatSync(fullPath).isDirectory())
            getExes(fullPath, depth - 1).forEach(x => {
                if (path.extname(x) == '.exe') files.push(`${file}\\${x}`);
            });
        else if (path.extname(file) == '.exe') files.push(file)
    }
    return files
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

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
        const path = folders[i++].path.replaceAll('\\\\', '\\') + '\\steamapps';
        const files = fs.readdirSync(path).toString().split(',');

        files.forEach(file => {
            if (file.slice(0, 11) == 'appmanifest') {
                const fullPath = path + '\\' + file;
                const manifest = fs.readFileSync(fullPath).toString();

                let parsedManifest = parseACF(manifest);
                parsedManifest.fullPath = path + '\\common\\' + parsedManifest.installdir;
                games.push(parsedManifest);
            }
        });
    }

    return games;
}

const guessExe = (gameName, depth = 2) => {
    const game = allGames.find(game => game.name == gameName);
    let exes = getExes(game.fullPath, depth);
    /*let exes = [];

    files.forEach(file => {
        if (file.split('.').slice(-1)[0] == 'exe') exes.push(file);
    });*/

    if (!exes.length) {
        if (depth <= 10) return guessExe(gameName, depth + 2);
        else return undefined;
    }

    let acronym = game.name.split(' ').map(e => e[0]).join('').toLowerCase();
    let lowercase = game.name.toLowerCase().replaceAll(' ', '');

    let similarities = [];

    for (let exe of exes) {
        let checkExe = path.basename(exe).toLowerCase().replaceAll(' ', '').split('.')[0];

        let bonus = 0;
        if (checkExe.indexOf(lowercase) != -1 || checkExe.indexOf(acronym) != -1) bonus = 0.25;

        const sim1 = similarity(lowercase, exe.toLowerCase().replaceAll(' '));
        const sim2 = similarity(acronym, exe.toLowerCase().replaceAll(' '));
        similarities.push({
            exe: exe,
            similarity: Math.max(sim1, sim2) + bonus
        });
    }

    var bestMatch = similarities.sort((a, b) => b.similarity - a.similarity)[0];
    if (bestMatch.similarity < 0.5 && depth < 8) return guessExe(gameName, depth + 2);
    else return game.fullPath + '\\' + bestMatch.exe;
}

const updateGamesList = () => {
    steamGames = getSteamGames();
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
            selectedGame = {
                name: gameName,
                exe: guessExe(gameName)
            }

            console.log(selectedGame);
        });
        $('<p>').text(game.name).appendTo(e);

        sidebarElement.append(e);
    });
}

const playSelectedGame = () => {
    exec(selectedGame.exe, {maxBuffer: 1024 * 10000}, (err, data) => {
        if (err) console.error(err);
        else console.log(data);
    });
}

$(document).ready(populateGamesList);