/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class ContextElementDependency extends ModuleDependency {
    type: string
    optional: boolean

    constructor(request: string, userRequest?: string) {
        super(request);
        if (userRequest) {
            this.userRequest = userRequest
        }
    }
}

ContextElementDependency.prototype.type = 'context element';

export = ContextElementDependency;
