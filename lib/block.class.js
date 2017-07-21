"use strict";

/**
 * @description split a download task into many blocks for Multi-threaded download
 */

class Block {
	
	constructor({index, dir, uri, start, end}) {
		this.dir = dir;
		/* options for module request */
		this.options = {uri, timeout: 5000, headers: {
			'Range': `bytes=${start}-${end}`
		}};
		this._start = start;
		this.end = end;
		this.size = this.end - this._start;
		this.errTimes = 0;
		this.idx = index;
	}


	set start(val) {
		this._start = val;
		this.options.headers.Range = `bytes=${this._start}-${this.end}`;
	}


	get start() {
		return this._start;
	}
}


module.exports = Block;