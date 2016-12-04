/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { LoaderContext } from '../typings/webpack-types'

class LoaderTargetPlugin {
    constructor(public target: string) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', (compilation: Compilation) => {
            compilation.plugin('normal-module-loader', (loaderContext: LoaderContext) => {
                loaderContext.target = this.target;
            });
        });
    }
}

export = LoaderTargetPlugin;
