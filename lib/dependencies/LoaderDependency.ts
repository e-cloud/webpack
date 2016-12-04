/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import NormalModule = require('../NormalModule')

class LoaderDependency extends ModuleDependency {
    module: NormalModule

    constructor(request: string) {
        super(request);
    }
}

LoaderDependency.prototype.type = 'loader';

export = LoaderDependency;
