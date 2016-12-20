/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

import Compilation = require('./Compilation')
import Compiler = require('./Compiler')
import Parser = require('./Parser')
import { CompilationParams } from '../typings/webpack-types'
import { Program } from 'estree'
import ConstDependency = require('./dependencies/ConstDependency')

class UseStrictPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            params.normalModuleFactory.plugin('parser', function (parser: Parser) {
                parser.plugin('program', function (ast: Program) {
                    const firstNode = ast.body[0];
                    if (firstNode
                        && firstNode.type === 'ExpressionStatement'
                        && firstNode.expression.type === 'Literal'
                        && firstNode.expression.value === 'use strict') {
                        // Remove "use strict" expression. It will be added later by the renderer again.
                        // This is necessary in order to not break the strict mode when webpack prepends code.
                        // @see https://github.com/webpack/webpack/issues/1970
                        const dep = new ConstDependency('', firstNode.range);
                        dep.loc = firstNode.loc;
                        this.state.current.addDependency(dep);
                        this.state.module.strict = true;
                    }
                });
            });
        });
    }
}

export = UseStrictPlugin;
