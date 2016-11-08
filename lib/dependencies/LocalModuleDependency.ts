/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import LocalModule = require('./LocalModule')

class Template {
    apply(dep, source) {
        if (!dep.range) {
            return;
        }
        source.replace(dep.range[0], dep.range[1] - 1, dep.localModule.variableName());
    }
}

class LocalModuleDependency extends NullDependency {
    optional: boolean

    constructor(public localModule: LocalModule, public range?) {
        super();
        localModule.flagUsed();
    }

    static Template = Template
}

export = LocalModuleDependency;
