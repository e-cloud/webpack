/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class RequireIncludeDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
	}

	static Template() {
	}
}

export = RequireIncludeDependency;
RequireIncludeDependency.prototype.type = 'require.include';

RequireIncludeDependency.Template.prototype.apply = function (dep, source, outputOptions, requestShortener) {
	let comment = '';
	if (outputOptions.pathinfo && dep.module) {
		comment = `/*! require.include ${requestShortener.shorten(dep.request)} */`;
	}
	source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
};
