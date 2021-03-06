/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class ContextElementDependency extends ModuleDependency {
    optional: boolean

    constructor(request: string, userRequest?: string) {
        super(request);
        if (userRequest) {
            this.userRequest = userRequest
        }
    }

    get type() {
        return 'context element';
    }
}

export = ContextElementDependency;
