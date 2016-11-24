/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

class Template {
    apply(dep, source, outputOptions, requestShortener) {
        source.replace(dep.range[0], dep.range[1], require('./WebpackMissingModule').module(dep.request));
    }
}

class UnsupportedDependency extends NullDependency {
    constructor(public request, public range) {
        super();
    }

    static Template = Template
}

export = UnsupportedDependency;
