"use strict";
const Downloader = require('./lib/downloader.class');
const handyfs = require('handyfs');


const main = async (uri, dest=process.cwd())=> {

	const FAIL_FILE_PATH = 'fail.json';
	const downloader = new Downloader(FAIL_FILE_PATH);
	try {
		await handyfs.accessAsync(FAIL_FILE_PATH, handyfs.constants.F_OK);
		let content = await handyfs.readFileAsync(FAIL_FILE_PATH);
		let {failBlockList,
				dest,
				tmpDir,
				workerNum} = JSON.parse(content);
		
		if(blockList[0].options.uri === uri) {
			await downloader.work(blockList, dest, tmpDir, workerNum);
		} else {
			await downloader.download(uri, dest, 5);
		}
	} catch(e) {
		await downloader.download(uri, dest, 5);
	}
}

module.exports = main;

