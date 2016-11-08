/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import MultiEntryDependency = require('./dependencies/MultiEntryDependency');
import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import MultiModuleFactory = require('./MultiModuleFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class MultiEntryPlugin {
    constructor(public context, public entries, public name) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params) {
            const multiModuleFactory = new MultiModuleFactory();
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(MultiEntryDependency, multiModuleFactory);

            compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
        });
        compiler.plugin('make', (compilation: Compilation, callback) => {
            compilation.addEntry(this.context, new MultiEntryDependency(this.entries.map(function (e, idx) {
                const dep = new SingleEntryDependency(e);
                dep.loc = `${this.name}:${100000 + idx}`;
                return dep;
            }, this), this.name), this.name, callback);
        });
    }
}

export = MultiEntryPlugin;
