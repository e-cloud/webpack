/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import EvalSourceMapDevToolModuleTemplatePlugin = require('./EvalSourceMapDevToolModuleTemplatePlugin');

import SourceMapDevToolModuleOptionsPlugin = require('./SourceMapDevToolModuleOptionsPlugin');

class EvalSourceMapDevToolPlugin {
	constructor(options) {
		if (arguments.length > 1) {
			throw new Error('EvalSourceMapDevToolPlugin only takes one argument (pass an options object)');
		}
		if (typeof options === 'string') {
			options = {
				append: options
			};
		}
		if (!options) {
			options = {};
		}
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin('compilation', function (compilation) {
			new SourceMapDevToolModuleOptionsPlugin(options).apply(compilation);
			compilation.moduleTemplate.apply(new EvalSourceMapDevToolModuleTemplatePlugin(compilation, options));
		});
	}
}

export = EvalSourceMapDevToolPlugin;
