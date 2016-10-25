/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class NullDependency extends Dependency {
    constructor() {
        super();
    }

    isEqualResource() {
        return false;
    }
}

export = NullDependency;
NullDependency.prototype.type = 'null';
