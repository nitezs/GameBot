// 引入相关模块
const cheerio = require('cheerio');
const { GamesDB: db, RecordDB: rdb } = require('./database');
const http = require('./http');
const log = require('./log');
const download = require('download');
const path = require('path');
const fs = require('fs');
const { sanitizeFilename } = require('./utils');

// 定义爬取的数据结构
const gameData = {
	title: '', // 游戏名
	genre: '', // 游戏分类
	developer: '', // 制作公司
	size: '', // 资源大小
	magnet: '', // 磁力链接
	description: '', // 游戏简介
	image: '', // 游戏封面
	screenshots: '', // 游戏截图
	version: '', // 游戏版本
};

// 定义一个异步函数，用于发送请求和解析数据，返回该页面是否有爬取失败项目
async function scrape(url, onlyGetPageSize = false) {
	try {
		let hasFailed = false;
		// 发送请求，获取网页内容
		const html = (await http(url)).data;

		// 使用cheerio模块，加载网页内容，创建一个$对象
		const $ = cheerio.load(html);
		if (onlyGetPageSize) {
			return $('.next.page-numbers').prev().text();
		}
		// 获取网页中的所有文章元素
		const articles = $('article');

		// 遍历文章元素，提取所需的数据
		for (let i = 0; i < articles.length; i++) {
			let element = articles[i];
			// 创建一个临时对象，用于存储当前文章的数据
			const tempData = Object.assign({}, gameData);

			// 获取文章的标题，并赋值给临时对象的title属性
			const title = $(element).find('h3:first>strong');
			if (title) {
				tempData.title = title[0].children[0].data.trim();
				log.info('正在获取: ', tempData.title);
				if (title[0].children[1]) {
					tempData.version = title[0].children[1].children[0].data.trim();
				}
			}

			// 获取文章内的所有图片，并下载图片到本地
			let imageCounter = 1;
			let continueExec = true;
			const images = $(element).find('a>img');
			for (let j = 0; j < images.length; j++) {
				if (!continueExec) {
					continue;
				}
				let element = images[j];
				let imageUrl = $(element).attr('src');
				let saveFile = path.join(
					__dirname,
					'images',
					sanitizeFilename(tempData.title),
					`${imageCounter}${path.extname(imageUrl)}`
				);
				if (fs.existsSync(saveFile)) {
					log.info('图片已存在: ', imageCounter++);
					if (imageCounter === 2) {
						tempData.image = path.basename(saveFile);
					} else {
						tempData.screenshots += path.basename(saveFile) + ',';
					}
					continue;
				}
				try {
					log.info('开始下载图片: ', imageUrl);
					imageCounter++;
					await download(imageUrl, path.dirname(saveFile), {
						rejectUnauthorized: false,
						filename: path.basename(saveFile),
					});
					if (imageCounter === 2) {
						tempData.image = path.basename(saveFile);
					} else {
						tempData.screenshots += path.basename(saveFile) + ',';
					}
				} catch (err) {
					if (imageCounter === 2) {
						log.error('游戏封面下载失败: ', imageUrl);
						log.info('尝试从riotpixels下载');
						let riotpixelsUrl = images[0].parent.attribs['href'];
						let riotpixelsHtml = (await http(riotpixelsUrl)).data;
						let riotpixels$ = cheerio.load(riotpixelsHtml);
						let riotpixelsImages = riotpixels$('.cover img');
						if (riotpixelsImages.length > 0) {
							let riotpixelsImageUrl = riotpixelsImages[0].attribs['src'];
							let riotpixelsSaveFile = path.join(
								__dirname,
								'images',
								sanitizeFilename(tempData.title),
								`1${path.extname(riotpixelsImageUrl)}`
							);
							try {
								log.info('开始下载图片: ', riotpixelsImageUrl);
								await download(
									riotpixelsImageUrl,
									path.dirname(riotpixelsSaveFile),
									{
										rejectUnauthorized: false,
										filename: path.basename(riotpixelsSaveFile),
									}
								);
								tempData.image = path.basename(riotpixelsSaveFile);
							} catch (err) {
								log.error('游戏封面仍下载失败: ', riotpixelsImageUrl);
								log.error('跳过游戏: ', tempData.title);
								hasFailed = true;
								continueExec = false;
								continue;
							}
						}
					}
				}
			}
			if (!continueExec) {
				continue;
			}
			if (tempData.screenshots) {
				tempData.screenshots = tempData.screenshots.substring(
					0,
					tempData.screenshots.length - 1
				);
			}

			// 获取文章的简介，并赋值给临时对象的description属性
			const description = $(element).find('.su-spoiler-content').text().trim();
			tempData.description = description;

			// 获取文章的正文内容，并赋值给一个变量content
			const content = $(element).find('.entry-content').text();

			// 使用正则表达式，从正文内容中匹配游戏分类，并赋值给临时对象的genre属性
			const genreRegex = /Genres\/Tags: (.*)/;
			const genreMatch = content.match(genreRegex);
			if (genreMatch) {
				const genre = genreMatch[1].trim();
				tempData.genre = genre;
			}

			// 使用正则表达式，从正文内容中匹配制作公司，并赋值给临时对象的developer属性
			const developerRegex = /(Company: (.*)|Companies: (.*))/;
			const developerMatch = content.match(developerRegex);
			if (developerMatch) {
				const developer = developerMatch[1].trim();
				tempData.developer = developer
					.replace('Company:', '')
					.replace('Companies:', '')
					.trim();
			}

			// 使用正则表达式，从正文内容中匹配资源大小，并赋值给临时对象的size属性
			const sizeRegex = /Repack Size: (.*)/;
			const sizeMatch = content.match(sizeRegex);
			if (sizeMatch) {
				const size = sizeMatch[1].trim();
				tempData.size = size;
			}

			// 使用正则表达式，从正文内容中匹配磁力链接，并赋值给临时对象的magnet属性
			let h = $(element).html();
			if (h) {
				const magnetRegex = /\"magnet:\?xt=urn:btih:(.*)\"/;
				const magnetMatch = h.match(magnetRegex);
				if (magnetMatch) {
					const magnet = magnetMatch[0]
						.trim()
						.substring(1, magnetMatch[0].length - 1);
					tempData.magnet = magnet;
				} else {
					log.error('没有找到磁力链接: ', tempData.title);
					hasFailed = true;
				}
			}
			// 将临时对象添加到数据库
			await saveToDatabase(tempData);
		}
		return hasFailed;
	} catch (error) {
		log.error(error);
	}
}

// 定义一个异步函数，用于将爬取的数据保存到数据库中
async function saveToDatabase(item) {
	try {
		let res = db.getGameByTitle(item.title);
		let check = db.checkGameByTitle(item.title, item.version);
		if (res && check) {
			log.info('游戏已存在且数据完整: ', item.title);
			return;
		}
		if (res && !check) {
			log.info('游戏已存在，但数据不完整: ', item.title);
			db.updateGameByTitle(item.title, item);
			return;
		}
		// 将当前游戏的数据插入到数据库中
		db.insertGame(
			item.title,
			item.genre,
			item.developer,
			item.size,
			item.magnet,
			item.description,
			item.image,
			item.screenshots,
			item.version
		);
		await new Promise((resolve) => {
			setTimeout(() => {
				resolve();
			}, 1000);
		});
	} catch (error) {
		log.error(error);
	}
}

async function main() {
	const yearStart = 2016;
	const yearEnd = 2023;
	let url = '';
	let maxMonth = 12;
	for (let year = yearEnd; year >= yearStart; year--) {
		for (let month = 1; month <= maxMonth; month++) {
			if (year == 2016) {
				month = 7;
			}
			if (year == 2023) {
				maxMonth = 3;
			}
			url = `https://fitgirl-repacks.site/${year}/${month
				.toString()
				.padStart(2, '0')}/`;
			let pageSize = await scrape(url, true);
			for (let page = 1; page <= pageSize; page++) {
				url = `https://fitgirl-repacks.site/${year}/${month
					.toString()
					.padStart(2, '0')}/page/${page}`;
				if (rdb.recordExists(url)) {
					log.info('已爬取: ', url);
					continue;
				} else {
					log.info('开始爬取: ', url);
					let hasFailed = await scrape(url);
					if (!hasFailed) {
						rdb.insertRecord(url);
					}
				}
			}
		}
	}
}

main();
