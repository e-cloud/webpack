/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Parser = require('./Parser')
import { Hash } from 'crypto';
import { CompilationParams, ParserOptions } from '../typings/webpack-types';
import Chunk = require('./Chunk')
import ParserHelpers = require('./ParserHelpers');

const REPLACEMENTS = {
    __webpack_hash__: '__webpack_require__.h', // eslint-disable-line camelcase
    __webpack_chunkname__: '__webpack_require__.cn' // eslint-disable-line camelcase
};
const REPLACEMENT_TYPES = {
    __webpack_hash__: 'string', // eslint-disable-line camelcase
    __webpack_chunkname__: 'string' // eslint-disable-line camelcase
};

class ExtendedAPIPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
            compilation.mainTemplate.plugin('require-extensions', function (source: string, chunk: Chunk, hash: Hash) {
                const buf = [source];
                buf.push('');
                buf.push('// __webpack_hash__');
                buf.push(`${this.requireFn}.h = ${JSON.stringify(hash)};`);
                buf.push('');
                buf.push('// __webpack_chunkname__');
                buf.push(`${this.requireFn}.cn = ${JSON.stringify(chunk.name)};`);
                return this.asString(buf);
            });
            compilation.mainTemplate.plugin('global-hash', () => true);

            params.normalModuleFactory.plugin('parser', function (parser: Parser, parserOptions: ParserOptions) {
                Object.keys(REPLACEMENTS).forEach(key => {
                    parser.plugin(`expression ${key}`, ParserHelpers.toConstantDependency(REPLACEMENTS[key]));
                    parser.plugin(`evaluate typeof ${key}`, ParserHelpers.evaluateToString(REPLACEMENT_TYPES[key]));
                });
            });
        });
    }
}

export = ExtendedAPIPlugin;
