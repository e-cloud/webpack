/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')

const REPLACEMENTS = {
    __webpack_require__: '__webpack_require__', // eslint-disable-line camelcase
    __webpack_public_path__: '__webpack_require__.p', // eslint-disable-line camelcase
    __webpack_modules__: '__webpack_require__.m', // eslint-disable-line camelcase
    __webpack_chunk_load__: '__webpack_require__.e', // eslint-disable-line camelcase
    __non_webpack_require__: 'require', // eslint-disable-line camelcase
    'require.onError': '__webpack_require__.oe' // eslint-disable-line camelcase
};
const REPLACEMENT_TYPES = {
    __webpack_public_path__: 'string', // eslint-disable-line camelcase
    __webpack_require__: 'function', // eslint-disable-line camelcase
    __webpack_modules__: 'object', // eslint-disable-line camelcase
    __webpack_chunk_load__: 'function' // eslint-disable-line camelcase
};
const IGNORES = [];

class APIPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser) {
                Object.keys(REPLACEMENTS).forEach(function (key) {
                    parser.plugin(`expression ${key}`, function (expr) {
                        const dep = new ConstDependency(REPLACEMENTS[key], expr.range);
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                        return true;
                    });
                    parser.plugin(`evaluate typeof ${key}`, function (expr) {
                            return new BasicEvaluatedExpression()
                                .setString(REPLACEMENT_TYPES[key])
                                .setRange(expr.range)
                        }
                    );
                });
                IGNORES.forEach(key => {
                    parser.plugin(key, () => true);
                });
            });
        });
    }
}

export = APIPlugin;
