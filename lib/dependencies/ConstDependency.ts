/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import { Hash } from 'crypto'
import { ReplaceSource } from 'webpack-sources'
import { SourceRange } from '../../typings/webpack-types'

class Template {
    apply(dep: ConstDependency, source: ReplaceSource) {
        if (typeof dep.range === 'number') {
            source.insert(dep.range, dep.expression);
        }
        else {
            source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
        }
    }
}

class ConstDependency extends NullDependency {
    optional: boolean

    constructor(public expression: string, public range: SourceRange | number) {
        super();
    }

    static Template = Template

    updateHash(hash: Hash) {
        hash.update(`${this.range}`);
        hash.update(`${this.expression}`);
    }
}

export = ConstDependency;
