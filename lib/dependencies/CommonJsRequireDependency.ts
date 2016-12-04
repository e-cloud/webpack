/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');
import { SourceRange } from '../../typings/webpack-types'

class CommonJsRequireDependency extends ModuleDependency {
    constructor(request: string, public range: SourceRange) {
        super(request);
    }

    static Template = require('./ModuleDependencyTemplateAsId')
}

CommonJsRequireDependency.prototype.type = 'cjs require';

export = CommonJsRequireDependency;
