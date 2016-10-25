/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
function chunkContainsModule(chunk, module) {
	const chunks = module.chunks;
	const modules = chunk.modules;
	if (chunks.length < modules.length) {
		return chunks.includes(chunk);
	}
	else {
		return modules.includes(module);
	}
}

function hasModule(chunk, module, checkedChunks) {
	if (chunkContainsModule(chunk, module)) {
		return [chunk];
	}
	if (chunk.parents.length === 0) {
		return false;
	}
	return allHaveModule(chunk.parents.filter(function (c) {
		return !checkedChunks.includes(c);
	}), module, checkedChunks);
}

function allHaveModule(someChunks, module, checkedChunks) {
	if (!checkedChunks) {
		checkedChunks = [];
	}
	const chunks = [];
	for (let i = 0; i < someChunks.length; i++) {
		checkedChunks.push(someChunks[i]);
		const subChunks = hasModule(someChunks[i], module, checkedChunks);
		if (!subChunks) {
			return false;
		}
		addToSet(chunks, subChunks);
	}
	return chunks;
}

function addToSet(set, items) {
	items.forEach(function (item) {
		if (!set.includes(item)) {
			set.push(item);
		}
	});
}

function debugIds(chunks) {
	const list = chunks.map(function (chunk) {
		return chunk.debugId;
	});
	const debugIdMissing = list.some(function (dId) {
		return typeof dId !== 'number';
	});
	if (debugIdMissing) {
		return 'no';
	}
	list.sort();
	return list.join(',');
}

class RemoveParentModulesPlugin {
	apply(compiler) {
		compiler.plugin('compilation', function (compilation) {
			compilation.plugin(['optimize-chunks-basic', 'optimize-extracted-chunks-basic'], function (chunks) {
				chunks.forEach(function (chunk) {
					const cache = {};
					chunk.modules.slice().forEach(function (module) {
						if (chunk.parents.length === 0) {
							return;
						}
						const dId = `$${debugIds(module.chunks)}`;
						let parentChunksWithModule;
						if (dId in cache && dId !== '$no') {
							parentChunksWithModule = cache[dId];
						}
						else {
							parentChunksWithModule = cache[dId] = allHaveModule(chunk.parents, module);
						}
						if (parentChunksWithModule) {
							module.rewriteChunkInReasons(chunk, parentChunksWithModule);
							chunk.removeModule(module);
						}
					});
				});
			});
		});
	}
}

export = RemoveParentModulesPlugin;
