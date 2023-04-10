const fs = require('fs');
const path = require('path');
const { sanitizeFilename } = require('./utils');
const { GamesDB: db } = require('./database');

let games = db.getAvailableGames();

for (let i = 0; i < games.length; i++) {
	let game = games[i];
	let {
		tag,
		developer,
		size,
		magnet,
		description,
		title,
		image,
		screenshots,
		version,
	} = game;
	let vaildTitle = sanitizeFilename(title);
	let p = path.join(__dirname, 'images', vaildTitle);
	if (!fs.existsSync(p)) {
		console.log(vaildTitle);
	}
}
