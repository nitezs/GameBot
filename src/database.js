const sqlite = require('better-sqlite3');
const path = require('path');

class GamesDB {
	// 构造函数，传入数据库文件路径，创建实例时会执行
	constructor(dbFilePath) {
		// 使用 better-sqlite3 打开指定路径的数据库
		this.db = sqlite(dbFilePath);
		// 创建表
		this.createTable();
	}

	// 创建表
	createTable() {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        title TEXT PRIMARY KEY,
        tag TEXT,
        developer TEXT,
        size TEXT,
        magnet TEXT,
        description TEXT,
		image TEXT,
		screenshots TEXT,
		version TEXT
      );
    `);
	}

	// 插入游戏数据
	insertGame(
		title,
		tag,
		developer,
		size,
		magnet,
		description,
		image,
		screenshots,
		version
	) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(
			`INSERT INTO games VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`
		);
		// 执行 SQL 语句，插入数据
		stmt.run(
			title,
			tag,
			developer,
			size,
			magnet,
			description,
			image,
			screenshots,
			version
		);
	}

	// 根据游戏名称获取游戏数据
	getGameByTitle(title) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(`SELECT * FROM games WHERE title = ?;`);
		// 执行 SQL 语句，获取数据
		return stmt.get(title);
	}

	// 获取所有游戏数据
	getAllGames() {
		// 准备 SQL 语句
		const stmt = this.db.prepare(`SELECT * FROM games;`);
		// 执行 SQL 语句，获取数据
		return stmt.all();
	}

	// 根据游戏名称更新游戏数据
	updateGameByTitle(
		title,
		{ tag, developer, size, magnet, description, image, screenshots, version }
	) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(
			`UPDATE games SET tag = ?, developer = ?, size = ?, magnet = ?, description = ?, image = ?, screenshots = ?, version = ? WHERE title = ?;`
		);
		// 执行 SQL 语句，更新数据
		stmt.run(
			tag,
			developer,
			size,
			magnet,
			description,
			title,
			image,
			screenshots,
			version
		);
	}

	// 根据游戏名称删除游戏数据
	deleteGameByTitle(title) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(`DELETE FROM games WHERE title = ?;`);
		// 执行 SQL 语句，删除数据
		stmt.run(title);
	}

	// 检测记录中的字段是否完整
	checkGameByTitle(title, version) {
		const stmt = this.db.prepare(`SELECT * FROM games WHERE title = ?;`);
		const res = stmt.get(title);
		if (res) {
			if (version && version != res.version) {
				return false;
			}
			if (res.magnet && res.image) {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	// 获取可用的游戏数据
	getAvailableGames() {
		// 准备 SQL 语句
		const stmt = this.db.prepare(
			`SELECT * FROM games WHERE magnet IS NOT NULL AND TRIM(magnet)!='';`
		);
		// 执行 SQL 语句，获取数据
		return stmt.all();
	}
}

class RecordDB {
	constructor(dbFilePath) {
		// 使用 better-sqlite3 打开指定路径的数据库
		this.db = sqlite(dbFilePath);
		// 创建表
		this.createTable();
	}

	// 创建表
	createTable() {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS record (
        link TEXT PRIMARY KEY
      );
    `);
	}

	// 插入记录
	insertRecord(link) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(`INSERT INTO record VALUES (?);`);
		// 执行 SQL 语句，插入数据
		stmt.run(link);
	}

	// 记录是否存在
	recordExists(link) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(`SELECT * FROM record WHERE link = ?;`);
		if (stmt.get(link)) {
			return true;
		} else {
			return false;
		}
	}
}

// 导出实例

module.exports = {
	GamesDB: new GamesDB(path.join(__dirname, '..', 'db', 'games.db')),
	RecordDB: new RecordDB(path.join(__dirname, '..', 'db', 'record.db')),
};
