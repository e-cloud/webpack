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

    get type() {
        return 'cjs require';
    }

    static Template = require('./ModuleDependencyTemplateAsId')
}

export = CommonJsRequireDependency;
