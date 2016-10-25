/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleFilenameHelpers = require('./ModuleFilenameHelpers');

class SourceMapDevToolModuleOptionsPlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compilation) {
        const options = this.options;
        if (options.module !== false) {
            compilation.plugin('build-module', function (module) {
                module.useSourceMap = true;
            });
        }
        if (options.lineToLine === true) {
            compilation.plugin('build-module', function (module) {
                module.lineToLine = true;
            });
        }
        else if (options.lineToLine) {
            compilation.plugin('build-module', function (module) {
                if (!module.resource) {
                    return;
                }
                let resourcePath = module.resource;
                const idx = resourcePath.indexOf('?');
                if (idx >= 0) {
                    resourcePath = resourcePath.substr(0, idx);
                }
                module.lineToLine = ModuleFilenameHelpers.matchObject(options.lineToLine, resourcePath);
            });
        }
    }
}

export = SourceMapDevToolModuleOptionsPlugin;
