/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import Compilation = require('./Compilation')
import Compiler = require('./Compiler')
import Parser = require('./Parser')

class UseStrictPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params) {
            params.normalModuleFactory.plugin('parser', function (parser: Parser) {
                parser.plugin('program', function (ast) {
                    const body = ast.body[0];
                    if (body
                        && body.type === 'ExpressionStatement'
                        && body.expression.type === 'Literal'
                        && body.expression.value === 'use strict') {
                        this.state.module.strict = true;
                    }
                });
            });
        });
    }
}

export = UseStrictPlugin;
