/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

class JsonpExportMainTemplatePlugin {
	constructor(name) {
		this.name = name;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;
		compilation.templatesPlugin('render-with-entry', function (source, chunk, hash) {
			const name = mainTemplate.applyPluginsWaterfall('asset-path', this.name || '', {
				hash,
				chunk
			});
			return new ConcatSource(`${name}(`, source, ');');
		}.bind(this));
		mainTemplate.plugin('global-hash-paths', function (paths) {
			if (this.name) {
				paths.push(this.name);
			}
			return paths;
		}.bind(this));
		mainTemplate.plugin('hash', function (hash) {
			hash.update('jsonp export');
			hash.update(`${this.name}`);
		}.bind(this));
	}
}

export = JsonpExportMainTemplatePlugin;
