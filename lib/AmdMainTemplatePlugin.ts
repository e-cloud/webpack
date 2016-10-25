/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource } from 'webpack-sources'

class AmdMainTemplatePlugin {
	constructor(name) {
		this.name = name;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;
		compilation.templatesPlugin('render-with-entry', function (source, chunk, hash) {
			const externals = chunk.modules.filter(function (m) {
				return m.external;
			});
			const externalsDepsArray = JSON.stringify(externals.map(function (m) {
				return typeof m.request === 'object' ? m.request.amd : m.request;
			}));
			const externalsArguments = externals.map(function (m) {
				return `__WEBPACK_EXTERNAL_MODULE_${m.id}__`;
			}).join(', ');
			if (this.name) {
				const name = mainTemplate.applyPluginsWaterfall('asset-path', this.name, {
					hash,
					chunk
				});
				return new ConcatSource(`define(${JSON.stringify(name)}, ${externalsDepsArray}, function(${externalsArguments}) { return `, source, '});');
			}
			else if (externalsArguments) {
				return new ConcatSource(`define(${externalsDepsArray}, function(${externalsArguments}) { return `, source, '});');
			}
			else {
				return new ConcatSource('define(function() { return ', source, '});');
			}
		}.bind(this));
		mainTemplate.plugin('global-hash-paths', function (paths) {
			if (this.name) {
				paths.push(this.name);
			}
			return paths;
		}.bind(this));
		mainTemplate.plugin('hash', function (hash) {
			hash.update('exports amd');
			hash.update(`${this.name}`);
		}.bind(this));
	}
}

export = AmdMainTemplatePlugin;
