/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

import DepBlockHelpers = require('./DepBlockHelpers');

class UnsupportedDependency extends NullDependency {
    constructor(request, range) {
        super();
        this.request = request;
        this.range = range;
    }

    static Template() {
    }
}

export = UnsupportedDependency;

UnsupportedDependency.Template.prototype.apply = function (dep, source, outputOptions, requestShortener) {
    source.replace(dep.range[0], dep.range[1], require('./WebpackMissingModule').module(dep.request));
};
