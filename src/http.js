const axios = require('axios');
const axiosRetry = require('axios-retry');
const { createWriteStream } = require('fs');
const path = require('path');
const fs = require('fs');

let logPath = path.join(__dirname, '..', 'log');

if (!fs.existsSync(logPath)) {
	fs.mkdirSync(logPath, { recursive: true });
}

const errorLogStream = createWriteStream(path.join(logPath, 'error.log'), {
	flags: 'a',
});

const axiosInstance = axios.create({
	Headers: {
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
	},
});

axiosRetry(axiosInstance, {
	retries: 3, // 设置重试次数
	retryDelay: (retryCount) => {
		// 设置重试延迟时间
		return retryCount * 1000;
	},
	retryCondition: (error) => {
		// 设置需要重试的错误类型
		return error.code === 'ECONNABORTED';
	},
});

// 记录错误日志
function logError(error) {
	const errorMsg = `Error at ${new Date().toLocaleString()}: ${
		error.message
	}\n`;
	errorLogStream.write(errorMsg);
}

// 发送请求
async function request(config) {
	try {
		const response = axiosInstance(config);
		return response;
	} catch (error) {
		logError(error);
	}
}

module.exports = request;
