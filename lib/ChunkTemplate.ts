/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

import Template = require('./Template');

class ChunkTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
	}

	render(chunk, moduleTemplate, dependencyTemplates) {
		const modules = this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates);
		const core = this.applyPluginsWaterfall('modules', modules, chunk, moduleTemplate, dependencyTemplates);
		let source = this.applyPluginsWaterfall('render', core, chunk, moduleTemplate, dependencyTemplates);
		if (chunk.hasEntryModule()) {
			source = this.applyPluginsWaterfall('render-with-entry', source, chunk);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ';');
	}

	updateHash(hash) {
		hash.update('ChunkTemplate');
		hash.update('2');
		this.applyPlugins('hash', hash);
	}

	updateHashForChunk(hash, chunk) {
		this.updateHash(hash);
		this.applyPlugins('hash-for-chunk', hash, chunk);
	}
}

export = ChunkTemplate;
