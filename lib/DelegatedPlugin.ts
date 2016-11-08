/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DelegatedModuleFactoryPlugin = require('./DelegatedModuleFactoryPlugin');
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

class DelegatedPlugin {
    constructor(public options) {
    }

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
        });
        compiler.plugin('compile', params => {
            params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin(this.options));
        });
    }
}

export = DelegatedPlugin;
