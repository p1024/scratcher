"use strict";

const handyfs = require('handyfs');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'), {multiArgs: true});
const path = require('path');
const contentDisposition = require('content-disposition');

const Block = require('./block.class');
const TaskController = require('./TaskController.class');
const Worker = require('./worker.class');


class Downloader {

	constructor(failFilePath) {
		this.FAIL_FILE_PATH = failFilePath;
	}


	/**
	 * remove illegal character in path string
	 * @param  {string} winPath path
	 * @return {string}         legal path
	 */
	winPathFilter(winPath) {
		return winPath.replace(/[\\/:\?"<>\|]/g, '');
	}


	/**
	 * check if the resource is partial content
	 * @param  {string}  uri uri of the resource
	 * @return {Boolean}     true stands for support
	 */
	async isPartial (uri) {
		let options = {
			uri,
			headers: {
				Range: 'bytes=0-1'
			}
		}
		try {
			let [response, data] = await request.getAsync(options);
			let filename=null;
			if(response.headers['content-disposition']) {
				let contentDis =  contentDisposition.parse(response.headers['content-disposition']);
				filename = contentDis.parameters.filename ? contentDis.parameters.filename : null;
			}

			return {
				isSupport: response.statusCode === 206,
				size: response.headers['content-range'].match(/\d+/g)[2],
				filename: filename
			};
		} catch(e) {
			return {
				isSupport: false
			};
		}
	}


	blockSplit (size, uri, tmpDir, blockSize = 1048576) {
		let blockCounts = Math.ceil(size/blockSize);
		let blockList = [];

		for(
			let i=0, start=0, end=blockSize; 
			i<blockCounts-1; 
			i++, start=end+1, end+=blockSize
		) {
			let block = new Block({
				index: i, 
				dir: path.join(tmpDir, `${i}.tmp`),
				uri, 
				start, 
				end
			});
			blockList.push(block);
		}
		let prevBlock = blockList[blockCounts-2];
		blockList.push(new Block({
			index: blockCounts-1, 
			dir: path.join(tmpDir, `${blockCounts-1}.tmp`),
			uri, 
			start: prevBlock.end+1, 
			end: size-0
		}));

		return blockList;
	}


	async concat (dest, fileList) {
		const fn = async (dest, file)=> {
			let ws = handyfs.createWriteStream(dest, {
				flags: 'r+',
				start: file.start
			});
			return new Promise((res, rej)=>{
				handyfs
					.createReadStream(file.dir)
					.pipe(ws)
					.on('error', rej)
					.on('finish', res);
			});
		}
		/* create the dest file */
		await handyfs.writeFileAsync(dest, Buffer.alloc(0));
		/* concat */
		for(let i=0, ln=fileList.length; i<ln; i++) {
			try {
				await fn(dest, fileList[i]);
			} catch(e) {
				throw(e);
			}
		}
		return dest;
	}

	async download(uri, dest=process.cwd(), workerNum=5) {

		let dir, destFileName;
		// 计算出路径，文件名
		if (dest === process.cwd()) {
			dir = dest;
			destFileName = this.winPathFilter(path.basename(uri));
			// 如果过长，干脆就用时间戳
			if(destFileName.length > 100) {
				destFileName = Date.now()+'';
			}
		} else {
			dir = path.dirname(dest);
			destFileName = path.basename(dest);
		}

		let tmpDir = path.join(dir, 'tmp'+Date.now());
		await handyfs.mkdirSimple(tmpDir);

		// 判断是否支持断点续传，获取尺寸，获取文件名（服务器提供的名称）
		let {isSupport, size, filename=null} = await this.isPartial(uri);

		if (dest === process.cwd()) {
			if(filename) {
				destFileName = filename;
			}
		}

		dest = path.join(dir, destFileName);

		if(isSupport) {
			/* 任务切分 */
			let blockList = this.blockSplit(size, uri, tmpDir);
			await this.work(blockList, dest, tmpDir, workerNum);
		} else {
			// let worker = new Worker(dest, uri, 0, size);
			// await work[worker];
		}
	}

	async work(blockList, dest, tmpDir, workerNum=5) {
		let fileController = new TaskController(blockList, 5);
		let workerList = [];

		for(let i=0; i<workerNum; i++) {
			let worker = new Worker(fileController);
			workerList.push(worker);
		}

		let promiseList = workerList.map(Worker=>Worker.work());
		await Promise.all(promiseList);
		
		if(fileController.isComplete()) {
			await this.concat(dest, blockList);
			/* 清场 */
			await handyfs.rmdirSimple(tmpDir);
		} else {
			let failBlockList = fileController.failBlockList;
			await handyfs.writeFileAsync(this.FAIL_FILE_PATH, JSON.stringify({
				failBlockList,
				dest,
				tmpDir,
				workerNum
			}));
		}
	}
}

module.exports = Downloader;