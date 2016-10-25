/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DllEntryDependency = require('./dependencies/DllEntryDependency');

import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import DllModuleFactory = require('./DllModuleFactory');

class DllEntryPlugin {
	constructor(context, entries, name, type) {
		this.context = context;
		this.entries = entries;
		this.name = name;
		this.type = type;
	}

	apply(compiler) {
		compiler.plugin('compilation', function (compilation, params) {
			const dllModuleFactory = new DllModuleFactory();
			const normalModuleFactory = params.normalModuleFactory;

			compilation.dependencyFactories.set(DllEntryDependency, dllModuleFactory);

			compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
		});
		compiler.plugin('make', function (compilation, callback) {
			compilation.addEntry(this.context, new DllEntryDependency(this.entries.map(function (e, idx) {
				const dep = new SingleEntryDependency(e);
				dep.loc = `${this.name}:${idx}`;
				return dep;
			}, this), this.name, this.type), this.name, callback);
		}.bind(this));
	}
}

export = DllEntryPlugin;
