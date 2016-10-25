/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DelegatedModuleFactoryPlugin = require('./DelegatedModuleFactoryPlugin');

import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');

class DelegatedPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.plugin('compilation', function (compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
		});
		compiler.plugin('compile', function (params) {
			params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin(this.options));
		}.bind(this));
	}
}

export = DelegatedPlugin;
