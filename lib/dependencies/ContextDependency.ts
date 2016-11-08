/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');

class ContextDependency extends Dependency {
    async: boolean
    userRequest: string

    constructor(public request: string, public recursive: string, public regExp: RegExp) {
        super();
        this.userRequest = request;
        this.async = false;
    }

    isEqualResource(other: Dependency) {
        if (!(other instanceof ContextDependency)) {
            return false;
        }
        return this.request === other.request
            && this.recursive === other.recursive
            && this.regExp === other.regExp
            && this.async === other.async;
    }
}

export = ContextDependency;
