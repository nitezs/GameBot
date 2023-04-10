const path = require('path');
function sanitizeFilename(filename, replaceWith = '_') {
	let name = path.basename(filename, path.extname(filename));
	const illegalRe = /[\/\?<>\\:\*\|\s\"\.]/g;
	const controlRe = /[\x00-\x1f\x80-\x9f]/g;

	return (
		name.replace(illegalRe, replaceWith).replace(controlRe, replaceWith) +
		path.extname(filename)
	);
}

module.exports = { sanitizeFilename };
