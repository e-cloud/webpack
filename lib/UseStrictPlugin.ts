/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');

import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import NullFactory = require('./NullFactory');

class UseStrictPlugin {
	apply(compiler) {
		compiler.plugin('compilation', function (compilation, params) {
			params.normalModuleFactory.plugin('parser', function (parser) {
				parser.plugin('program', function (ast) {
					const body = ast.body[0];
					if (body && body.type === 'ExpressionStatement' && body.expression.type === 'Literal' && body.expression.value === 'use strict') {
						this.state.module.strict = true;
					}
				});
			});
		});
	}
}

export = UseStrictPlugin;
