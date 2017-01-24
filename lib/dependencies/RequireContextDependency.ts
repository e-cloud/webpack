/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ContextDependency = require('./ContextDependency');
import { SourceRange } from '../../typings/webpack-types'

class RequireContextDependency extends ContextDependency {
    optional: boolean

    constructor(request: string, recursive: boolean, regExp: RegExp, public range: SourceRange) {
        super(request, recursive, regExp);
    }

    get type() {
        return 'require.context';
    }

    static Template = require('./ModuleDependencyTemplateAsRequireId')
}

export = RequireContextDependency;
