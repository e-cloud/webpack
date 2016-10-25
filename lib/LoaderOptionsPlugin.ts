/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');

class LoaderOptionsPlugin {
	constructor(options) {
		if (typeof options !== 'object') {
			options = {};
		}
		if (!options.test) {
			options.test = {
				test() {
					return true;
				}
			};
		}
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin('compilation', function (compilation) {
			compilation.plugin('normal-module-loader', function (context, module) {
				const resource = module.resource;
				if (!resource) {
					return;
				}
				const i = resource.indexOf('?');
				if (ModuleFilenameHelpers.matchObject(options, i < 0 ? resource : resource.substr(0, i))) {
					Object.keys(options).filter(function (key) {
						return !['include', 'exclude', 'test'].includes(key);
					}).forEach(function (key) {
						context[key] = options[key];
					});
				}
			});
		});
	}
}

export = LoaderOptionsPlugin;
