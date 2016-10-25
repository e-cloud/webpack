/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SystemImportDependency = require('./SystemImportDependency');

import SystemImportContextDependency = require('./SystemImportContextDependency');
import UnsupportedFeatureWarning = require('../UnsupportedFeatureWarning');
import ConstDependency = require('./ConstDependency');
import BasicEvaluatedExpression = require('../BasicEvaluatedExpression');
import SystemImportParserPlugin = require('./SystemImportParserPlugin');

class SystemPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin('compilation', function (compilation, params) {
			const normalModuleFactory = params.normalModuleFactory;
			const contextModuleFactory = params.contextModuleFactory;

			compilation.dependencyFactories.set(SystemImportDependency, normalModuleFactory);
			compilation.dependencyTemplates.set(SystemImportDependency, new SystemImportDependency.Template());

			compilation.dependencyFactories.set(SystemImportContextDependency, contextModuleFactory);
			compilation.dependencyTemplates.set(SystemImportContextDependency, new SystemImportContextDependency.Template());

			params.normalModuleFactory.plugin('parser', function (parser, parserOptions) {

				if (typeof parserOptions.system !== 'undefined' && !parserOptions.system) {
					return;
				}

				function setTypeof(expr, value) {
					parser.plugin(`evaluate typeof ${expr}`, function (expr) {
						return new BasicEvaluatedExpression().setString(value).setRange(expr.range);
					});
					parser.plugin(`typeof ${expr}`, function (expr) {
						const dep = new ConstDependency(JSON.stringify(value), expr.range);
						dep.loc = expr.loc;
						this.state.current.addDependency(dep);
						return true;
					});
				}

				function setNotSupported(name) {
					parser.plugin(`evaluate typeof ${name}`, function (expr) {
						return new BasicEvaluatedExpression().setString('undefined').setRange(expr.range);
					});
					parser.plugin(`expression ${name}`, function (expr) {
						const dep = new ConstDependency('(void 0)', expr.range);
						dep.loc = expr.loc;
						this.state.current.addDependency(dep);
						if (!this.state.module) {
							return;
						}
						this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, `${name} is not supported by webpack.`));
						return true;
					});
				}

				setTypeof('System', 'object');
				setTypeof('System.import', 'function');
				setNotSupported('System.set');
				setNotSupported('System.get');
				setNotSupported('System.register');
				parser.plugin('expression System', function (expr) {
					const dep = new ConstDependency('{}', expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return true;
				});
				parser.apply(new SystemImportParserPlugin(options));
			});
		});
	}
}

export = SystemPlugin;
