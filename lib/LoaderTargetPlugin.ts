/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class LoaderTargetPlugin {
	constructor(target) {
		this.target = target;
	}

	apply(compiler) {
		const target = this.target;
		compiler.plugin('compilation', function (compilation) {
			compilation.plugin('normal-module-loader', function (loaderContext) {
				loaderContext.target = target;
			});
		});
	}
}

export = LoaderTargetPlugin;
