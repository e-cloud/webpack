/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, OriginalSource } from 'webpack-sources'

function accessorToObjectAccess(accessor) {
    return accessor.map(a => `[${JSON.stringify(a)}]`).join('');
}

function accessorAccess(base, accessor) {
    accessor = [].concat(accessor);
    return accessor.map((a, idx) => {
        a = base + accessorToObjectAccess(accessor.slice(0, idx + 1));
        if (idx === accessor.length - 1) {
            return a;
        }
        return `${a} = ${a} || {}`;
    }).join(', ');
}

class UmdMainTemplatePlugin {
    constructor(name, options) {
        this.name = name;
        this.optionalAmdExternalAsGlobal = options.optionalAmdExternalAsGlobal;
        this.namedDefine = options.namedDefine;
        this.auxiliaryComment = options.auxiliaryComment;
    }

    apply(compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (source, chunk, hash) => {
            let externals = chunk.modules.filter(m => m.external);
            const optionalExternals = [];
            let requiredExternals = [];
            if (this.optionalAmdExternalAsGlobal) {
                externals.forEach(m => {
                    if (m.optional) {
                        optionalExternals.push(m);
                    }
                    else {
                        requiredExternals.push(m);
                    }
                });
                externals = requiredExternals.concat(optionalExternals);
            }
            else {
                requiredExternals = externals;
            }

            function replaceKeys(str) {
                return mainTemplate.applyPluginsWaterfall('asset-path', str, {
                    hash,
                    chunk
                });
            }

            function externalsDepsArray(modules) {
                return `[${replaceKeys(
                    modules.map(m => JSON.stringify(typeof m.request === 'object' ? m.request.amd : m.request))
                        .join(', ')
                )}]`;
            }

            function externalsRootArray(modules) {
                return replaceKeys(modules.map(m => {
                    let request = m.request;
                    if (typeof request === 'object') {
                        request = request.root;
                    }
                    return `root${accessorToObjectAccess([].concat(request))}`;
                }).join(', '));
            }

            function externalsRequireArray(type) {
                return replaceKeys(externals.map(m => {
                    let expr;
                    let request = m.request;
                    if (typeof request === 'object') {
                        request = request[type];
                    }
                    if (Array.isArray(request)) {
                        expr = `require(${JSON.stringify(request[0])})${accessorToObjectAccess(request.slice(1))}`;
                    }
                    else {
                        expr = `require(${JSON.stringify(request)})`;
                    }
                    if (m.optional) {
                        expr = `(function webpackLoadOptionalExternalModule() { try { return ${expr}; } catch(e) {} }())`;
                    }
                    return expr;
                }).join(', '));
            }

            function externalsArguments(modules) {
                return modules.map(m => `__WEBPACK_EXTERNAL_MODULE_${m.id}__`).join(', ');
            }

            function libraryName(library) {
                return JSON.stringify(replaceKeys([].concat(library).pop()));
            }

            let amdFactory;
            if (optionalExternals.length > 0) {
                amdFactory = `function webpackLoadOptionalExternalModuleAmd(${externalsArguments(requiredExternals)}) {\n\t\t\treturn factory(${requiredExternals.length > 0
                    ? externalsArguments(requiredExternals) + ', ' + externalsRootArray(optionalExternals)
                    : externalsRootArray(optionalExternals)});\n\t\t}`;
            }
            else {
                amdFactory = 'factory';
            }

            return new ConcatSource(new OriginalSource(`(function webpackUniversalModuleDefinition(root, factory) {\n${this.auxiliaryComment && typeof this.auxiliaryComment === 'string'
                ? '   //' + this.auxiliaryComment + '\n'
                : this.auxiliaryComment.commonjs2
                ? '   //' + this.auxiliaryComment.commonjs2 + '\n'
                : ''}\tif(typeof exports === 'object' && typeof module === 'object')\n\t\tmodule.exports = factory(${externalsRequireArray('commonjs2')});\n${this.auxiliaryComment && typeof this.auxiliaryComment === 'string'
                ? '   //' + this.auxiliaryComment + '\n'
                : this.auxiliaryComment.amd
                ? '   //' + this.auxiliaryComment.amd + '\n'
                : ''}\telse if(typeof define === 'function' && define.amd)\n${requiredExternals.length > 0
                ? this.name && this.namedDefine === true
                ? '\t\tdefine(' + libraryName(this.name) + ', ' + externalsDepsArray(requiredExternals) + ', ' + amdFactory + ');\n'
                : '\t\tdefine(' + externalsDepsArray(requiredExternals) + ', ' + amdFactory + ');\n'
                : this.name && this.namedDefine === true
                ? '\t\tdefine(' + libraryName(this.name) + ', [], ' + amdFactory + ');\n'
                : '\t\tdefine([], ' + amdFactory + ');\n'}${this.name
                ? (this.auxiliaryComment && typeof this.auxiliaryComment === 'string'
                ? '   //' + this.auxiliaryComment + '\n'
                : this.auxiliaryComment.commonjs
                ? '   //' + this.auxiliaryComment.commonjs + '\n'
                : '') + '\telse if(typeof exports === \'object\')\n' + '\t\texports[' + libraryName(this.name) + '] = factory(' + externalsRequireArray('commonjs') + ');\n' + (this.auxiliaryComment && typeof this.auxiliaryComment === 'string'
                ? '   //' + this.auxiliaryComment + '\n'
                : this.auxiliaryComment.root
                ? '   //' + this.auxiliaryComment.root + '\n'
                : '') + '\telse\n' + '\t\t' + replaceKeys(accessorAccess('root', this.name)) + ' = factory(' + externalsRootArray(externals) + ');\n'
                : '\telse {\n' + (externals.length > 0
                ? '\t\tvar a = typeof exports === \'object\' ? factory(' + externalsRequireArray('commonjs') + ') : factory(' + externalsRootArray(externals) + ');\n'
                : '\t\tvar a = factory();\n') + '\t\tfor(var i in a) (typeof exports === \'object\' ? exports : root)[i] = a[i];\n' + '\t}\n'}})(this, function(${externalsArguments(externals)}) {\nreturn `, 'webpack/universalModuleDefinition'), source, '\n});\n');
        }.bind(this));
        mainTemplate.plugin('global-hash-paths', function (paths) {
            if (this.name) {
                paths = paths.concat(this.name);
            }
            return paths;
        });
        mainTemplate.plugin('hash', hash => {
            hash.update('umd');
            hash.update(`${this.name}`);
        });
    }
}

export = UmdMainTemplatePlugin;
