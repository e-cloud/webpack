/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import FunctionModuleTemplatePlugin = require('./FunctionModuleTemplatePlugin');

import RequestShortener = require('./RequestShortener');

class FunctionModulePlugin {
	constructor(options, requestShortener) {
		this.options = options;
		this.requestShortener = requestShortener;
	}

	apply(compiler) {
		compiler.plugin('compilation', function (compilation) {
			compilation.moduleTemplate.requestShortener = this.requestShortener || new RequestShortener(compiler.context);
			compilation.moduleTemplate.apply(new FunctionModuleTemplatePlugin());
		}.bind(this));
	}
}

export = FunctionModulePlugin;
