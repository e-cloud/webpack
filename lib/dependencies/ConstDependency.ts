/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');

class ConstDependency extends NullDependency {
    constructor(expression, range) {
        super();
        this.expression = expression;
        this.range = range;
    }

    static Template() {
    }

    updateHash(hash) {
        hash.update(`${this.range}`);
        hash.update(`${this.expression}`);
    }
}

export = ConstDependency;

ConstDependency.Template.prototype.apply = function (dep, source) {
    if (typeof dep.range === 'number') {
        source.insert(dep.range, dep.expression);
    }
    else {
        source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
    }
};
