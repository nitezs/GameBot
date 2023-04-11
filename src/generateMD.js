const fs = require('fs');
const path = require('path');
const { sanitizeFilename, getFormattedDate } = require('./utils');
const { GamesDB: db } = require('./database');
const chatGPT = require('./chatGPT');
const log = require('./log');

let games = db.getAvailableGames();

(async () => {
	if (!fs.existsSync(path.join(__dirname, 'posts'))) {
		fs.mkdirSync(path.join(__dirname, 'posts'), { recursive: true });
	}
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

		tag = tag.replace(/[\n\"]/g, '');

		let vaildTitle = sanitizeFilename(title);
		let imagePath = path.join(__dirname, 'images', vaildTitle);
		if (fs.existsSync(imagePath)) {
			let savePath = path.join(__dirname, 'posts', `${vaildTitle}.md`);

			// 简介
			if (!description.toString().trim()) {
				description = null;
			}

			// 截图字符串
			let screenshotsStr = '';
			if (screenshots.toString().trim()) {
				screenshots
					.toString()
					.split(',')
					.forEach((screenshot) => {
						screenshotsStr += `![](/img/${vaildTitle}/${screenshot.trim()})\n`;
					});
			} else {
				screenshotsStr = null;
			}

			// 标签，分类字符串
			let categories = '\n';
			if (tag.toString().trim()) {
				tag.split(',').forEach((t) => {
					categories += `  - [${t.trim()}]\n`;
				});
			} else {
				tag = null;
				categories = null;
			}

			// 游戏大小
			if (!size.toString().trim()) {
				size = null;
			}

			let md = `---
title: "${title.replace(/\"/g, '\\"')} ${version.replace(/\"/g, '\\"')}"
tags: ${tag ? `[${tag}]` : ''}
cover: /img/${vaildTitle}/${image}
date: ${getFormattedDate()}
update: ${getFormattedDate()}
categories: ${categories ? '\n  ' + categories.trim() : ''}
urlname: ${vaildTitle}
keywords: ${tag ? `[${tag}]` : ''}
---
# 简介

> 开发商：${developer}

${description ?? '暂无'}

# 游戏截图

${screenshotsStr ?? '暂无'}

# 下载

> 游戏大小：${size ?? '未知'}

[磁力链接](${magnet})`;
			if (fs.existsSync(savePath)) {
				log.warn('文件已存在', savePath);
				continue;
			} else {
				log.info('生成文件', savePath);
				fs.writeFileSync(savePath, md);
			}
		} else {
			log.error('图片目录不存在', vaildTitle);
		}
	}
})();
