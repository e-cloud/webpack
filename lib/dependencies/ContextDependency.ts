/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Dependency = require('../Dependency');
import { SourceRange } from '../../typings/webpack-types';
import ContextModule = require('../ContextModule')

class ContextDependency extends Dependency {
    async: string;
    userRequest: string;
    critical?: false | string;
    replaces: {
        range: SourceRange
        value: string
    }[];
    prepend?: string;
    module: ContextModule;

    constructor(public request: string, public recursive: boolean, public regExp: RegExp) {
        super();
        this.userRequest = request;
        this.async = false;
    }

    isEqualResource(other: Dependency): boolean {
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
