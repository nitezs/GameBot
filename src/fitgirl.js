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
	tags: '', // 游戏分类
	developer: '', // 制作公司
	size: '', // 资源大小
	magnet: '', // 磁力链接
	description: '', // 游戏简介
	image: '', // 游戏封面
	screenshots: '', // 游戏截图
	version: '', // 游戏版本
};

// 获取文章的标题和版本号
function getTitleAndVersion($, element, tempData) {
	let hasFailed = false;
	const title = $(element).find('h3:first>strong');
	if (title.length > 0 && title[0].children.length > 0) {
		tempData.title = title[0].children[0].data.trim();
		if (tempData.title) {
			log.info('正在获取: ', tempData.title);
		} else {
			log.error('标题获取失败，跳过');
			hasFailed = true;
		}
		if (title[0].children[1]) {
			tempData.version = title[0].children[1].children[0].data.trim();
		} else {
			log.warn('版本号获取失败: ', tempData.title);
		}
	} else {
		hasFailed = true;
	}
	return hasFailed;
}

// 下载图片
async function downloadImage($, element, tempData) {
	let imageCounter = 1;
	let hasFailed = false; // 新增变量，用于记录封面是否下载失败
	const images = $(element).find('a>img');
	for (let i = 0; i < images.length; i++) {
		let element = images[i];
		let imageUrl = $(element).attr('src');
		let saveFile = path.join(
			__dirname,
			'images',
			sanitizeFilename(tempData.title),
			`${imageCounter}${path.extname(imageUrl)}`
		);
		if (fs.existsSync(saveFile)) {
			log.warn('图片已存在: ', imageCounter++);
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
				log.warn('游戏封面下载失败: ', imageUrl);
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
						log.info('跳过游戏: ', tempData.title);
						hasFailed = true; // 设置下载失败的标记
						break;
					}
				}
			} else {
				log.warn('图片下载失败: ', imageUrl);
			}
		}
	}
	if (tempData.screenshots) {
		tempData.screenshots = tempData.screenshots.substring(
			0,
			tempData.screenshots.length - 1
		);
	}
	return hasFailed;
}

// 获取文章的简介
function getDescription($, element, tempData) {
	let hasFailed = false;
	const description = $(element).find('.su-spoiler-content');
	if (description.length > 0) {
		tempData.description = description.text().trim();
	} else {
		hasFailed = true;
	}
	return hasFailed;
}

// 获取磁力链接
async function getMagnet($, element, tempData) {
	// 使用正则表达式，从正文内容中匹配磁力链接，并赋值给临时对象的magnet属性
	let h = $(element).html();
	if (h) {
		const magnetRegex = /\"magnet:\?xt=urn:btih:(.*?)\"/;
		const magnetMatch = h.match(magnetRegex);
		if (magnetMatch) {
			const magnet = magnetMatch[0]
				.trim()
				.substring(1, magnetMatch[0].length - 1);
			tempData.magnet = magnet;
		} else {
			// log.error('没有找到磁力链接: ', tempData.title);
			// 直接匹配磁力链接失败，匹配rutor.info链接
			const rutorInfoRegex = /\"https?:\/\/rutor\.info\/(.*?)\"/;
			const rutorInfoMatch = h.match(rutorInfoRegex);
			if (rutorInfoMatch) {
				const rutorInfo = rutorInfoMatch[0]
					.trim()
					.substring(1, rutorInfoMatch[0].length - 1);
				let rutorInfoRes = await http(rutorInfo);
				if (rutorInfoRes.status === 200) {
					let rutorInfoHtml = rutorInfoRes.data;
					let rutorInfo$ = cheerio.load(rutorInfoHtml);
					let rutorInfoMagnet = rutorInfo$('a[href^="magnet:"]');
					if (rutorInfoMagnet.length > 0) {
						tempData.magnet = rutorInfoMagnet[0].attr['href'];
					} else {
						log.error('没有找到磁力链接: ', tempData.title);
						log.error('跳过游戏: ', tempData.title);
						hasFailed = true;
					}
				}
			}
			hasFailed = true;
		}
	}
}

// 获取标签
async function getTags($, element, tempData) {
	const riotpixelslink = $(element).find(
		'.entry-categories a:contains("riotpixels.com")'
	);
	if (riotpixelslink.length > 0) {
		let riotpixelslinkUrl = riotpixelslink[0].attribs['href'];
		riotpixelslinkUrl = riotpixelslinkUrl.replace(
			/https?:\/\/[a-zA-Z]{2}\./,
			'https://zh.'
		);
		let riotpixelslinkHtml = (await http(riotpixelslinkUrl)).data;
		let riotpixelslink$ = cheerio.load(riotpixelslinkHtml);
		let riotpixelslinkTags1 = riotpixelslink$(
			'#tags_short>table:first tr:first td:first strong:first a'
		);
		let riotpixelslinkTags2 = riotpixelslink$(
			'#tags_short>table:eq(1) tr td:eq(1) strong:first a'
		);
		let tags = '';
		if (riotpixelslinkTags1.length > 0) {
			tags += riotpixelslinkTags1[0].attribs['title'] + ',';
		}
		if (riotpixelslinkTags2.length > 0) {
			for (let i = 0; i < riotpixelslinkTags2.length; i++) {
				tags += riotpixelslinkTags2[i].attribs['title'] + ',';
			}
		}
		tempData.tags = tags;
	}
}

// 获取资源大小、游戏分类、制作公司
function getOtherInfo($, element, tempData) {
	// 获取文章的正文内容，并赋值给一个变量content
	const content = $(element).find('.entry-content').text();

	// 使用正则表达式，从正文内容中匹配制作公司，并赋值给临时对象的developer属性
	const developerRegex = /(Company: (.*)|Companies: (.*))/;
	const developerMatch = content.match(developerRegex);
	if (developerMatch) {
		const developer = developerMatch[1].trim();
		let tmpDeveloper = developer
			.replace('Company:', '')
			.replace('Companies:', '');
		if (tmpDeveloper.indexOf('Language') > -1) {
			tmpDeveloper = tmpDeveloper.substring(
				0,
				tmpDeveloper.indexOf('Language')
			);
		}
		tempData.developer = tmpDeveloper;
	}

	// 使用正则表达式，从正文内容中匹配资源大小，并赋值给临时对象的size属性
	const sizeRegex = /Repack Size: (.*)/;
	const sizeMatch = content.match(sizeRegex);
	if (sizeMatch) {
		const size = sizeMatch[1].trim();
		tempData.size = size;
	}
}

// 定义一个异步函数，用于发送请求和解析数据，返回该页面是否有爬取失败项目
async function scrape(url, onlyGetPageSize = false) {
	try {
		// 新增变量，用于记录该页面是否有爬取失败项目
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

			// 获取文章的标题和版本
			hasFailed = getTitleAndVersion($, element, tempData);
			if (hasFailed) {
				// 如果标题获取失败则直接跳过该游戏
				continue;
			}

			// 获取磁力链接
			hasFailed = await getMagnet($, element, tempData);
			if (hasFailed) {
				// 如果磁力链接获取失败则直接跳过该游戏
				continue;
			}

			// 获取文章图片
			hasFailed = await downloadImage($, element, tempData);
			if (hasFailed) {
				// 如果封面下载失败则直接跳过该游戏
				continue;
			}

			// 获取文章的简介
			if (getDescription($, element, tempData)) {
				log.warn('简介获取失败: ', tempData.title);
			}

			// 获取游戏分类
			await getTags($, element, tempData);

			// 获取资源大小、制作公司
			getOtherInfo($, element, tempData);

			// 将临时对象添加到数据库
			await saveToDatabase(tempData);
		}
		return hasFailed;
	} catch (error) {
		log.error('发生未知错误', error);
		return true;
	}
}

// 定义一个异步函数，用于将爬取的数据保存到数据库中
async function saveToDatabase(item) {
	try {
		let res = db.getGameByTitle(item.title);
		let check = db.checkGameByTitle(item.title, item.version);
		if (res) {
			if (check) {
				log.info('游戏已存在且数据完整，跳过: ', item.title);
				return;
			} else {
				log.info('游戏已存在但数据不完整: ', item.title);
				db.updateGameByTitle(item.title, item);
				return;
			}
		}
		// 将当前游戏的数据插入到数据库中
		db.insertGame(
			item.title,
			item.tags,
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
				maxMonth = 4;
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
