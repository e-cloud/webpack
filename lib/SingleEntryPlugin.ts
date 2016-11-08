/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import SingleEntryDependency = require('./dependencies/SingleEntryDependency');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class SingleEntryPlugin {
    constructor(public context, public entry, public name) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params) {
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
