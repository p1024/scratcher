"use strict";

class Block {
	constructor(value) {
		this.next = null;
		this.value = value;
	}
}


class Chain {

	constructor() {
		this.head = null;
		this.current = null;
		this.length = 0;
	}

	add(value) {
		let block = new Block(value);
		
		if(this.head === null) {
			this.head = block;
		} else {
			this.current.next = block;
		}
		
		this.current = block;
		this.length += 1;
	}

	get(idx) {
		let targetBlock = this.head;
		for(let i=1; i<=idx; i++) {
			targetBlock = targetBlock.next;
			if(targetBlock === null) {
				return null;
			}
		}

		return targetBlock === null? null:targetBlock.value;
	}

	del(idx) {
		if(idx>0) {
			let prev = this.get(idx-1);
			if(prev) {
				prev.next = prev.next.next;
				return true;
			} else {
				return false;
			}
		} else {
			if(this.head) {
				this.head = this.head.next;
				return true;
			} else {
				return false;
			}
		}
	}

	set(idx, value) {
		let block = this.get(idx);
		if(block!== null) {
			block.value = value;
		}
	}

	get blockList() {
		let block = this.head;
		let blockList = [];
		while(block) {
			blockList.push(block.value);
			block = block.next;
		}
		return blockList;
	}


	empty() {
		this.head = null;
	}

	copy(chain) {
		this.head = chain.head;
	}
}


module.exports = Chain;