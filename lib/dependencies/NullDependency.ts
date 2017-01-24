/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class NullDependency extends Dependency {
    static Template = class {
        apply(...args: any[]) {}
    }

    get type() {
        return 'null';
    }

    isEqualResource() {
        return false;
    }

    updateHash(hash: any) {}
}

export = NullDependency;
