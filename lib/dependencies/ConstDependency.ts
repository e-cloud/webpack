/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

class Template {
    apply(dep, source) {
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

    constructor(public expression, public range) {
        super();
    }

    static Template = Template

    updateHash(hash) {
        hash.update(`${this.range}`);
        hash.update(`${this.expression}`);
    }
}

export = ConstDependency;
