/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import DelegatedModuleFactoryPlugin = require('./DelegatedModuleFactoryPlugin');
import DelegatedSourceDependency = require('./dependencies/DelegatedSourceDependency');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'
import LibManifestPlugin = require('./LibManifestPlugin')

class DelegatedPlugin {
    constructor(public options: DelegatedPlugin.Option) {}

    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            const normalModuleFactory = params.normalModuleFactory;

            compilation.dependencyFactories.set(DelegatedSourceDependency, normalModuleFactory);
        });
        compiler.plugin('compile', (params: CompilationParams) => {
            params.normalModuleFactory.apply(new DelegatedModuleFactoryPlugin(this.options));
        });
    }
}

declare namespace DelegatedPlugin {
    interface Option {
        content: LibManifestPlugin.ManifestContent
        context: string
        extensions: string[]
        scope: string
        source: string
        type: string
    }
}

export = DelegatedPlugin;
