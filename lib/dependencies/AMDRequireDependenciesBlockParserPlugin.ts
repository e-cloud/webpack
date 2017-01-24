/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AMDRequireItemDependency = require('./AMDRequireItemDependency');
import AMDRequireArrayDependency = require('./AMDRequireArrayDependency');
import AMDRequireContextDependency = require('./AMDRequireContextDependency');
import AMDRequireDependenciesBlock = require('./AMDRequireDependenciesBlock');
import UnsupportedDependency = require('./UnsupportedDependency');
import LocalModuleDependency = require('./LocalModuleDependency');
import ContextDependencyHelpers = require('./ContextDependencyHelpers');
import LocalModulesHelpers = require('./LocalModulesHelpers');
import ConstDependency = require('./ConstDependency');
import getFunctionExpression = require('./getFunctionExpression');
import UnsupportedFeatureWarning = require('../UnsupportedFeatureWarning');
import Parser = require('../Parser')
import { CallExpression, Expression, Identifier } from 'estree'
import { ModuleOptions } from '../../typings/webpack-types'
import BasicEvaluatedExpression = require('../BasicEvaluatedExpression')
import ModuleDependency = require('./ModuleDependency')

class AMDRequireDependenciesBlockParserPlugin {
    constructor(public options: ModuleOptions) {
    }

    apply(parser: Parser) {
        const options = this.options;
        parser.plugin('call require', function (expr: CallExpression) {
            let param: BasicEvaluatedExpression;
            let dep;
            let old;
            let result;

            old = this.state.current;

            if (expr.arguments.length >= 1) {
                param = this.evaluateExpression(expr.arguments[0]);
                dep = new AMDRequireDependenciesBlock(
                    expr,
                    param.range,
                    (expr.arguments.length > 1) ? expr.arguments[1].range : null,
                    (expr.arguments.length > 2) ? expr.arguments[2].range : null,
                    this.state.module,
                    expr.loc
                );
                this.state.current = dep;
            }

            if (expr.arguments.length === 1) {
                this.inScope([], () => {
                    result = this.applyPluginsBailResult('call require:amd:array', expr, param);
                });
                this.state.current = old;
                if (!result) {
                    return;
                }
                this.state.current.addBlock(dep);
                return true;
            }

            if (expr.arguments.length === 2 || expr.arguments.length === 3) {
                try {
                    this.inScope([], () => {
                        result = this.applyPluginsBailResult('call require:amd:array', expr, param);
                    });
                    if (!result) {
                        dep = new UnsupportedDependency('unsupported', expr.range);
                        old.addDependency(dep);
                        if (this.state.module) {
                            this.state.module.errors.push(new UnsupportedFeatureWarning(this.state.module, `Cannot statically analyse 'require(..., ...)' in line ${expr.loc.start.line}`));
                        }
                        dep = null;
                        return true;
                    }
                    dep.functionBindThis = processFunctionArgument(this, expr.arguments[1] as Expression);
                    if (expr.arguments.length === 3) {
                        dep.errorCallbackBindThis = processFunctionArgument(this, expr.arguments[2] as Expression);
                    }
                } finally {
                    this.state.current = old;
                    if (dep) {
                        this.state.current.addBlock(dep);
                    }
                }
                return true;
            }
        });
        parser.plugin('call require:amd:array', function (expr: CallExpression, param: BasicEvaluatedExpression) {
            if (param.isArray()) {
                param.items.forEach(function (param) {
                    const result = this.applyPluginsBailResult('call require:amd:item', expr, param);
                    if (result === undefined) {
                        this.applyPluginsBailResult('call require:amd:context', expr, param);
                    }
                }, this);
                return true;
            }
            else if (param.isConstArray()) {
                const deps: ModuleDependency[] = [];
                param.array.forEach(function (request) {
                    let dep;
                    let localModule;
                    if (request === 'require') {
                        dep = '__webpack_require__';
                    }
                    else if (['exports', 'module'].includes(request)) {
                        dep = request;
                    }
                    else if (localModule = LocalModulesHelpers.getLocalModule(this.state, request)) {
                        // eslint-disable-line no-cond-assign
                        dep = new LocalModuleDependency(localModule);
                        dep.loc = expr.loc;
                        this.state.current.addDependency(dep);
                    }
                    else {
                        dep = new AMDRequireItemDependency(request);
                        dep.loc = expr.loc;
                        dep.optional = !!this.scope.inTry;
                        this.state.current.addDependency(dep);
                    }
                    deps.push(dep);
                }, this);
                const dep = new AMDRequireArrayDependency(deps, param.range);
                dep.loc = expr.loc;
                dep.optional = !!this.scope.inTry;
                this.state.current.addDependency(dep);
                return true;
            }
        });
        parser.plugin('call require:amd:item', function (expr: CallExpression, param: BasicEvaluatedExpression) {
            if (param.isConditional()) {
                param.options.forEach(function (param) {
                    const result = this.applyPluginsBailResult('call require:amd:item', expr, param);
                    if (result === undefined) {
                        this.applyPluginsBailResult('call require:amd:context', expr, param);
                    }
                }, this);
                return true;
            }
            else if (param.isString()) {
                let dep;
                let localModule;
                if (param.string === 'require') {
                    dep = new ConstDependency('__webpack_require__', param.range);
                } else if(param.string === 'module') {
                    dep = new ConstDependency(this.state.module.moduleArgument || 'module', param.range);
                } else if(param.string === 'exports') {
                    dep = new ConstDependency(this.state.module.exportsArgument || 'exports', param.range);
                }
                else if (localModule = LocalModulesHelpers.getLocalModule(this.state, param.string)) {
                    // eslint-disable-line no-cond-assign
                    dep = new LocalModuleDependency(localModule, param.range);
                }
                else {
                    dep = new AMDRequireItemDependency(param.string, param.range);
                }
                dep.loc = expr.loc;
                dep.optional = !!this.scope.inTry;
                this.state.current.addDependency(dep);
                return true;
            }
        });
        parser.plugin('call require:amd:context', function (expr: CallExpression, param) {
            const dep = ContextDependencyHelpers.create(AMDRequireContextDependency, param.range, param, expr, options);
            if (!dep) {
                return;
            }
            dep.loc = expr.loc;
            dep.optional = !!this.scope.inTry;
            this.state.current.addDependency(dep);
            return true;
        });
    }
}

function processFunctionArgument(parser: Parser, expression: Expression) {
    let bindThis = true;
    const fnData = getFunctionExpression(expression);
    if (fnData) {
        parser.inScope(fnData.fn.params.filter(function (i: Identifier) {
            return !['require', 'module', 'exports'].includes(i.name);
        }), function () {
            if (fnData.fn.body.type === 'BlockStatement') {
                parser.walkStatement(fnData.fn.body);
            }
            else {
                parser.walkExpression(fnData.fn.body);
            }
        });
        parser.walkExpressions(fnData.expressions);
        if (fnData.needThis === false) {
            bindThis = false;
        }
    }
    else {
        parser.walkExpression(expression);
    }
    return bindThis;
}

export = AMDRequireDependenciesBlockParserPlugin;
