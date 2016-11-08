/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class NullDependency extends Dependency {
    isEqualResource() {
        return false;
    }
}

NullDependency.prototype.type = 'null';

export = NullDependency;
