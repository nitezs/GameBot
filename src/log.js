class Log {
	constructor(logLevel = 'info') {
		this.logLevel = logLevel;
	}

	info(...args) {
		if (this.logLevel === 'info') {
			console.log(`[INFO] ${new Date().toISOString()}: `, ...args);
		}
	}

	warn(...args) {
		if (this.logLevel === 'info' || this.logLevel === 'warn') {
			console.warn(`[WARN] ${new Date().toISOString()}: `, ...args);
		}
	}

	error(...args) {
		if (this.logLevel !== 'off') {
			console.error(`[ERROR] ${new Date().toISOString()}: `, ...args);
		}
	}
}

module.exports = new Log();
