/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class AMDRequireArrayDependency extends Dependency {
	constructor(depsArray, range) {
		super();
		this.depsArray = depsArray;
		this.range = range;
	}

	static Template() {
	}
}

export = AMDRequireArrayDependency;
AMDRequireArrayDependency.prototype.type = 'amd require array';

AMDRequireArrayDependency.Template.prototype.apply = function (dep, source, outputOptions, requestShortener) {
	const content = `[${dep.depsArray.map(function (dep) {
		if (typeof dep === 'string') {
			return dep;
		}
		else {
			let comment = '';
			if (outputOptions.pathinfo) {
				comment = '/*! ' + requestShortener.shorten(dep.request) + ' */ ';
			}
			if (dep.module) {
				return '__webpack_require__(' + comment + JSON.stringify(dep.module.id) + ')';
			}
			else {
				return require('./WebpackMissingModule').module(dep.request);
			}
		}
	}).join(', ')}]`;
	source.replace(dep.range[0], dep.range[1] - 1, content);
};
