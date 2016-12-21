/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, OriginalSource } from 'webpack-sources'
import { AuxiliaryComment } from '../typings/webpack-types'
import { Hash } from 'crypto'
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')
import ExternalModule = require('./ExternalModule')

function accessorToObjectAccess(accessor: string[]) {
    return accessor.map(a => `[${JSON.stringify(a)}]`).join('');
}

function accessorAccess(base: string, accessor: string) {
    let accessorArr = [].concat(accessor);
    return accessorArr.map((a, idx) => {
        a = base + accessorToObjectAccess(accessorArr.slice(0, idx + 1));
        if (idx === accessorArr.length - 1) {
            return a;
        }
        return `${a} = ${a} || {}`;
    }).join(', ');
}

class UmdMainTemplatePlugin {
    auxiliaryComment: AuxiliaryComment
    optionalAmdExternalAsGlobal: boolean
    namedDefine: boolean

    constructor(
        public name: string, options: {
            auxiliaryComment: AuxiliaryComment
            optionalAmdExternalAsGlobal: boolean
            namedDefine: boolean
        }
    ) {
        this.optionalAmdExternalAsGlobal = options.optionalAmdExternalAsGlobal;
        this.namedDefine = options.namedDefine;
        this.auxiliaryComment = options.auxiliaryComment;
    }

    apply(compilation: Compilation) {
        const mainTemplate = compilation.mainTemplate;
        compilation.templatesPlugin('render-with-entry', (
            source: string,
            chunk: Chunk,
            hash: string
        ) => {
            let externals = chunk.modules.filter((m: ExternalModule) => m.external) as ExternalModule[];
            const optionalExternals: ExternalModule[] = [];
            let requiredExternals: ExternalModule[] = [];
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

            function replaceKeys(str: string) {
                return mainTemplate.applyPluginsWaterfall('asset-path', str, {
                    hash,
                    chunk
                });
            }

            function externalsDepsArray(modules: ExternalModule[]) {
                return `[${replaceKeys(
                    modules.map(({ request }) =>
                            JSON.stringify(typeof request === 'object' ? request.amd : request)
                        )
                        .join(', ')
                )}]`;
            }

            function externalsRootArray(modules: ExternalModule[]) {
                return replaceKeys(modules.map(m => {
                    let request = m.request;
                    if (typeof request === 'object') {
                        // todo: here is strange, although it works, but against the documentation
                        request = request.root;
                    }
                    return `root${accessorToObjectAccess([].concat(request))}`;
                }).join(', '));
            }

            function externalsRequireArray(type: string) {
                return replaceKeys(
                    externals.map(m => {
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
                        })
                        .join(', ')
                );
            }

            function externalsArguments(modules: ExternalModule[]) {
                return modules.map(m => `__WEBPACK_EXTERNAL_MODULE_${m.id}__`)
                    .join(', ');
            }

            function libraryName(library: string) {
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

            return new ConcatSource(
                new OriginalSource(`
(function webpackUniversalModuleDefinition(root, factory) {
    ${normalizeAuxiliaryComment(this.auxiliaryComment, 'commonjs2')}
    if(typeof exports === "object" && typeof module === "object")
        module.exports = factory(${externalsRequireArray('commonjs2')});
    ${normalizeAuxiliaryComment(this.auxiliaryComment, 'amd')}
    else if(typeof define === "function" && define.amd)
` +
                    (requiredExternals.length > 0
                            ? (this.name && this.namedDefine === true
                                    ? `        define(${libraryName(this.name)}, ${externalsDepsArray(requiredExternals)}, ${amdFactory});`
                                    : `        define(${externalsDepsArray(requiredExternals)}, ${amdFactory});`
                            )
                            : (this.name && this.namedDefine === true
                                    ? `        define(${libraryName(this.name)}, [], ${amdFactory});`
                                    : `        define([], ${amdFactory});`
                            )
                    ) +
                    (this.name
                        ? `
    ${normalizeAuxiliaryComment(this.auxiliaryComment, 'commonjs')}
    else if(typeof exports === "object")
        exports[${libraryName(this.name)}] = factory(${externalsRequireArray('commonjs')});
    ${normalizeAuxiliaryComment(this.auxiliaryComment, 'root')}
    else
        ${replaceKeys(accessorAccess('root', this.name))} = factory(${externalsRootArray(externals)});
`
                        : `
    else {
${(externals.length > 0
                            ? `        var a = typeof exports === "object" ? factory(${externalsRequireArray('commonjs')}) : factory(${externalsRootArray(externals)});`
                            : '        var a = factory();')}
        for(var i in a) (typeof exports === "object" ? exports : root)[i] = a[i];
    }
`)
                    +
                    `})(this, function(${externalsArguments(externals)}) {\nreturn `, 'webpack/universalModuleDefinition'),
                source,
                ';\n})'
            );
        });
        mainTemplate.plugin('global-hash-paths', (paths: string[]) => {
            if (this.name) {
                paths = paths.concat(this.name);
            }
            return paths;
        });
        mainTemplate.plugin('hash', (hash: Hash) => {
            hash.update('umd');
            hash.update(`${this.name}`);
        });
    }
}

export = UmdMainTemplatePlugin;

function isString(val: any) {
    return typeof val === 'string'
}

function normalizeAuxiliaryComment(auxiliaryComment: AuxiliaryComment, type: string) {
    if (auxiliaryComment) {
        if (isString(auxiliaryComment)) {
            return `//${auxiliaryComment}`
        }
        else if (auxiliaryComment[type]) {
            return `//${auxiliaryComment[type]}`
        }
    }

    return ''
}
