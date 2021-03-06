/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');
import Compilation = require('./Compilation')
import Module = require('./Module')

class SourceMapDevToolModuleOptionsPlugin {
    constructor(public options: {
                    module: boolean
                    lineToLine: boolean
                }) {
    }

    apply(compilation: Compilation) {
        if (this.options.module !== false) {
            compilation.plugin('build-module', function (module: Module) {
                module.useSourceMap = true;
            });
        }
        if (this.options.lineToLine === true) {
            compilation.plugin('build-module', function (module: Module) {
                module.lineToLine = true;
            });
        }
        else if (this.options.lineToLine) {
            compilation.plugin('build-module', (module: Module) => {
                if (!module.resource) {
                    return;
                }
                let resourcePath = module.resource;
                const idx = resourcePath.indexOf('?');
                if (idx >= 0) {
                    resourcePath = resourcePath.substr(0, idx);
                }
                module.lineToLine = ModuleFilenameHelpers.matchObject(this.options.lineToLine, resourcePath);
            });
        }
    }
}

export = SourceMapDevToolModuleOptionsPlugin;
