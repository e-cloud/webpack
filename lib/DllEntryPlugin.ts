/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DllEntryDependency = require('./dependencies/DllEntryDependency');
import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import DllModuleFactory = require('./DllModuleFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import NormalModuleFactory = require('./NormalModuleFactory')
import { CompilationParams } from '../typings/webpack-types'

class DllEntryPlugin {
    constructor(public context: string, public entries: string[], public name: string, public type?: string) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const dllModuleFactory = new DllModuleFactory();
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(DllEntryDependency, dllModuleFactory);

            compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
        });

        compiler.plugin('make', (compilation: Compilation, callback) => {
            compilation.addEntry(
                this.context,
                new DllEntryDependency(
                    this.entries.map((e, idx) => {
                        const dep = new SingleEntryDependency(e);
                        dep.loc = `${this.name}:${idx}`;
                        return dep;
                    }),
                    this.name,
                    this.type
                ),
                this.name,
                callback
            );
        });
    }
}

export = DllEntryPlugin;
