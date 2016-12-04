/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import { SourceRange } from '../../typings/webpack-types'

class RequireResolveDependency extends ModuleDependency {
    weak: boolean

    constructor(request: string, public range: SourceRange) {
        super(request);
    }

    static Template = require('./ModuleDependencyTemplateAsId')
}

RequireResolveDependency.prototype.type = 'require.resolve';

export = RequireResolveDependency;
