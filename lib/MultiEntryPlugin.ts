/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import MultiEntryDependency = require('./dependencies/MultiEntryDependency');
import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import MultiModuleFactory = require('./MultiModuleFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'

class MultiEntryPlugin {
    constructor(public context: string, public entries: string[], public name: string) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const multiModuleFactory = new MultiModuleFactory();
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);

            compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
        });
        compiler.plugin('make', (compilation: Compilation, callback) => {
            const dep = MultiEntryPlugin.createDependency(this.entries, this.name);
            compilation.addEntry(this.context, dep, this.name, callback);
        });
    }

    static createDependency(entries: string[], name: string) {
        return new MultiEntryDependency(entries.map((e, idx) => {
            const dep = new SingleEntryDependency(e);
            dep.loc = `${this.name}:${100000 + idx}`;
            return dep;
        }), name);
    }
}

export = MultiEntryPlugin;
