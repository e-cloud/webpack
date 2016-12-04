/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'

class SingleEntryPlugin {
    constructor(public context: string, public entry: string, public name: string) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
        });
        compiler.plugin('make', (compilation: Compilation, callback) => {
            const dep = new SingleEntryDependency(this.entry);
            dep.loc = this.name;
            compilation.addEntry(this.context, dep, this.name, callback);
        });
    }
}

export = SingleEntryPlugin;
