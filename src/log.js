class Log {
	constructor(logLevel = 'info') {
		this.logLevel = logLevel;
	}

	info(...args) {
		if (this.logLevel === 'info') {
			console.log(`[INFO]\t${new Date().toISOString()}: `, ...args);
		}
	}

	warn(...args) {
		if (this.logLevel === 'info' || this.logLevel === 'warn') {
			console.warn(`[WARN]\t${new Date().toISOString()}: `, ...args);
		}
	}

	error(...args) {
		if (this.logLevel !== 'off') {
			console.error(`[ERROR]\t${new Date().toISOString()}: `, ...args);
		}
	}
}

module.exports = new Log();
