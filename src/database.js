const sqlite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbPath)) {
	fs.mkdirSync(dbPath, { recursive: true });
}

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
		{
			tag = null,
			developer = null,
			size = null,
			magnet = null,
			description = null,
			image = null,
			screenshots = null,
			version = null,
		}
	) {
		const pstmt = this.db.prepare(`SELECT * FROM games WHERE title = ?;`);
		const game = pstmt.get(title);

		// 准备 SQL 语句
		const stmt = this.db.prepare(
			`UPDATE games SET tag = ?, developer = ?, size = ?, magnet = ?, description = ?, image = ?, screenshots = ?, version = ? WHERE title = ?;`
		);

		// 只更新传递的参数
		stmt.run(
			tag ?? game.tag,
			developer ?? game.developer,
			size ?? game.size,
			magnet ?? game.magnet,
			description ?? game.description,
			image ?? game.image,
			screenshots ?? game.screenshots,
			version ?? game.version,
			title
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
	checkGameByTitle(title) {
		// 准备 SQL 语句
		const stmt = this.db.prepare(`SELECT * FROM games WHERE title = ?;`);
		// 执行 SQL 语句，获取数据
		const game = stmt.get(title);
		if (
			game &&
			game.title &&
			game.description &&
			game.image &&
			game.magnet &&
			game.screenshots &&
			game.size &&
			game.tag &&
			game.developer &&
			game.version
		) {
			return true;
		} else {
			return false;
		}
	}

	// 获取可用的游戏数据
	getAvailableGames() {
		// 准备 SQL 语句
		const stmt = this.db.prepare(
			`SELECT * FROM games WHERE magnet IS NOT NULL AND TRIM(magnet)!='' AND image IS NOT NULL AND TRIM(image)!='';`
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
