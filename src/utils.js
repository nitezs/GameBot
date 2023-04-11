const path = require('path');
function sanitizeFilename(filename, replaceWith = '_') {
	const illegalRe = /[\/\?<>\\:\*\|\s\"\.]/g;
	const controlRe = /[\x00-\x1f\x80-\x9f]/g;
	if (filename.length > 255) {
		filename = filename.substring(0, 255);
	}
	return filename
		.replace(illegalRe, replaceWith)
		.replace(controlRe, replaceWith);
}

function getFormattedDate() {
	const date = new Date();
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const day = date.getDate().toString().padStart(2, '0');
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = { sanitizeFilename, getFormattedDate };
