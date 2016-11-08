/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class ModuleDependency extends Dependency {
    userRequest: string
    type: string
    optional: boolean

    constructor(public request: string) {
        super();
        this.userRequest = request;
    }

    isEqualResource(other) {
        if (!(other instanceof ModuleDependency)) {
            return false;
        }
        return this.request === other.request;
    }
}

export = ModuleDependency;
