/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class Template {
    apply(dep, source, outputOptions, requestShortener) {
        let comment = '';
        if (outputOptions.pathinfo && dep.module) {
            comment = `/*! require.include ${requestShortener.shorten(dep.request)} */`;
        }
        source.replace(dep.range[0], dep.range[1] - 1, `undefined${comment}`);
    }
}

class RequireIncludeDependency extends ModuleDependency {
    constructor(request, public range) {
        super(request);
    }

    static Template = Template
}

RequireIncludeDependency.prototype.type = 'require.include';

export = RequireIncludeDependency;
