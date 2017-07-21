"use strict";
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'), {multiArgs: true});
const handyfs = require('handyfs');

class Worker {
	constructor(taskController) {
		this.taskController = taskController;
	}

	async work() {
		let taskController = this.taskController;
		let block = taskController.get();

		while(block!==(void 0)) {
			try {
				// 下载
				await this.download(block.dir, block.options);
			} catch(e) {
				//如果错误，就回滚到队列当中
				block.start = block.start + e.size;
				block.errTimes += 1;
				taskController.back(block);
			}
			block = taskController.get();
		}
	}

	async download(dir, options) {
		let size = 0;
		return new Promise((res, rej)=>{
			request
				.get(options)
				.on('data', chunk=>{
					size += chunk.length;
				})
				.on('error', err=>{
					rej({err, size});
				})
				.pipe(handyfs.createWriteStream(dir))
				.on('finish', ()=>{
					res({err:null, size});
				})
		});
	}
}

module.exports = Worker;