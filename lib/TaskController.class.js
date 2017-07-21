"use strict";

const {List} = require('linked-list');

class TaskController {

	constructor(blockList, limit = 5) {
		
		this.list = new List;
		this.limit = limit;
		this.failList = new List;

		for(let i=0; i<blockList.length; i++) {
			this.list.add(blockList[i]);
		}
	}

	/* 获取任务块 */
	get() {
		let block = this.list.find(0);
		if(block) {
			this.list.remove(0);
		}
		return block;
	}

	back(block) {
		
		if(block.errTimes < this.limit) {
			this.list.add(block);
		} else {
			this.failList.add(block);
		}
	}

	isComplete() {
		return this.failList.find(0) === void 0;
	}

	retry() {
		this.list.copy(this.failList);
		this.failList.empty();
	}

	get failBlockList() {
		return this.failList.nodeList;
	}
}


module.exports = TaskController;