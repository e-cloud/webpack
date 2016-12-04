/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import { SourceRange } from '../../typings/webpack-types'

class AMDRequireItemDependency extends ModuleDependency {
    optional: boolean

    constructor(request: string, public range?: SourceRange) {
        super(request);
    }

    static Template = require('./ModuleDependencyTemplateAsRequireId')
}

AMDRequireItemDependency.prototype.type = 'amd require';

export = AMDRequireItemDependency;
