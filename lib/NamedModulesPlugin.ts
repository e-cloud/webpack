/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class NamedModulesPlugin {
	constructor(options) {
		this.options = options || {};
	}

	apply(compiler) {
		compiler.plugin('compilation', function (compilation) {
			compilation.plugin('before-module-ids', function (modules) {
				modules.forEach(function (module) {
					if (module.id === null && module.libIdent) {
						module.id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
					}
				}, this);
			}.bind(this));
		}.bind(this));
	}
}

export = NamedModulesPlugin;
