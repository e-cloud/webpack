/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DependenciesBlock = require('./DependenciesBlock');

import ModuleReason = require('./ModuleReason');
import Template = require('./Template');
import HarmonyModulesHelpers = require('./dependencies/HarmonyModulesHelpers');

let debugId = 1000;

class Module extends DependenciesBlock {
	constructor() {
		super();
		this.context = null;
		this.reasons = [];
		this.debugId = debugId++;
		this.lastId = -1;
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.used = null;
		this.usedExports = null;
		this.providedExports = null;
		this.chunks = [];
		this.warnings = [];
		this.dependenciesWarnings = [];
		this.errors = [];
		this.dependenciesErrors = [];
		this.strict = false;
		this.meta = {};
	}

	get entry() {
		throw new Error('Module.entry was removed. Use Chunk.entryModule');
	}

	set entry(val) {
		throw new Error('Module.entry was removed. Use Chunk.entryModule');
	}

	disconnect() {
		this.reasons.length = 0;
		this.lastId = this.id;
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.used = null;
		this.usedExports = null;
		this.providedExports = null;
		this.chunks.length = 0;
		super.disconnect();
	}

	unseal() {
		this.lastId = this.id;
		this.id = null;
		this.index = null;
		this.index2 = null;
		this.chunks.length = 0;
		super.unseal();
	}

	addChunk(chunk) {
		const idx = this.chunks.indexOf(chunk);
		if (idx < 0) {
			this.chunks.push(chunk);
		}
	}

	removeChunk(chunk) {
		return this._removeAndDo('chunks', chunk, 'removeModule');
	}

	addReason(module, dependency) {
		this.reasons.push(new ModuleReason(module, dependency));
	}

	removeReason(module, dependency) {
		for (let i = 0; i < this.reasons.length; i++) {
			const r = this.reasons[i];
			if (r.module === module && r.dependency === dependency) {
				this.reasons.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	hasReasonForChunk(chunk) {
		for (let i = 0; i < this.reasons.length; i++) {
			const r = this.reasons[i];
			if (r.chunks) {
				if (r.chunks.includes(chunk)) {
					return true;
				}
			}
			else if (r.module.chunks.includes(chunk)) {
				return true;
			}
		}
		return false;
	}

	rewriteChunkInReasons(oldChunk, newChunks) {
		this.reasons.forEach(function (r) {
			if (!r.chunks) {
				if (!r.module.chunks.includes(oldChunk)) {
					return;
				}
				r.chunks = r.module.chunks;
			}
			r.chunks = r.chunks.reduce(function (arr, c) {
				addToSet(arr, c !== oldChunk ? [c] : newChunks);
				return arr;
			}, []);
		});
	}

	isUsed(exportName) {
		if (this.used === null) {
			return exportName;
		}
		if (!exportName) {
			return this.used ? true : false;
		}
		if (!this.used) {
			return false;
		}
		if (!this.usedExports) {
			return false;
		}
		if (this.usedExports === true) {
			return exportName;
		}
		const idx = this.usedExports.indexOf(exportName);
		if (idx < 0) {
			return false;
		}
		if (this.isProvided(exportName)) {
			return Template.numberToIdentifer(idx);
		}
		return exportName;
	}

	isProvided(exportName) {
		if (!Array.isArray(this.providedExports)) {
			return null;
		}
		return this.providedExports.includes(exportName);
	}

	toString() {
		return `Module[${this.id || this.debugId}]`;
	}

	needRebuild() /* fileTimestamps, contextTimestamps */ {
		return true;
	}

	updateHash(hash) {
		hash.update(`${this.id}${this.used}`);
		hash.update(JSON.stringify(this.usedExports));
		super.updateHash(hash);
	}

	sortItems() {
		super.sortItems();
		this.chunks.sort(byId);
		this.reasons.sort(function (a, b) {
			return byId(a.module, b.module);
		});
	}
}

export = Module;

Module.prototype._removeAndDo = require('./removeAndDo');

function addToSet(set, items) {
	items.forEach(function (item) {
		if (!set.includes(item)) {
			set.push(item);
		}
	});
}

function byId(a, b) {
	return a.id - b.id;
}

Module.prototype.identifier = null;
Module.prototype.readableIdentifier = null;
Module.prototype.build = null;
Module.prototype.source = null;
Module.prototype.size = null;
Module.prototype.nameForCondition = null;
