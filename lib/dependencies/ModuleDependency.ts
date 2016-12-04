/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');
import { SourceRange } from '../../typings/webpack-types'

class ModuleDependency extends Dependency {
    userRequest: string
    type: string
    optional: boolean
    range?: SourceRange

    constructor(public request: string) {
        super();
        this.userRequest = request;
    }

    isEqualResource(other: Dependency): boolean {
        if (!(other instanceof ModuleDependency)) {
            return false;
        }
        return this.request === other.request;
    }
}

export = ModuleDependency;
