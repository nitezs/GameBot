const http = require('./http');
const uuid = require('uuid');
const log = require('./log');

class ChatGPT {
	constructor() {
		this.parent_message_id = uuid.v4();
		this.conversation_id = '';
	}

	async talk(message) {
		try {
			let res = await http({
				method: 'post',
				url: 'https://p.nite07.com/api/conversation/talk',
				headers: {
					'Content-Type': 'application/json',
				},
				data: {
					prompt: message,
					model: 'Turbo',
					message_id: uuid.v4(),
					parent_message_id: this.parent_message_id,
					conversation_id: this.conversation_id,
				},
			});
			let data = res.data.split('data:');
			if (data[data.length - 1].trim() == '[DONE]') {
				let p = JSON.parse(data[data.length - 2].trim());
				let parts = p.message.content.parts;
				let answer = '';
				parts.forEach((item) => {
					answer += item;
				});
				this.parent_message_id = p.message.id;
				this.conversation_id = p.conversation_id;
				return answer;
			} else {
				return null;
			}
		} catch (err) {
			log.error('ChatGPT请求错误', err);
		}
	}
}

module.exports = new ChatGPT();
