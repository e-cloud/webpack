/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import Compilation = require('./Compilation')
import Compiler = require('./Compiler')
import Parser = require('./Parser')
import { CompilationParams } from '../typings/webpack-types'
import { Program } from 'estree'

class UseStrictPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            params.normalModuleFactory.plugin('parser', function (parser: Parser) {
                parser.plugin('program', function (ast: Program) {
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
