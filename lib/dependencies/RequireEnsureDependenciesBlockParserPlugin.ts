/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import RequireEnsureDependenciesBlock = require('./RequireEnsureDependenciesBlock');
import RequireEnsureItemDependency = require('./RequireEnsureItemDependency');
import getFunctionExpression = require('./getFunctionExpression');
import { CallExpression } from 'estree';
import Parser = require('../Parser')

class RequireEnsureDependenciesBlockParserPlugin {
    apply(parser: Parser) {
        parser.plugin('call require.ensure', function (this: Parser, expr: CallExpression) {
            let chunkName = null;
            let chunkNameRange = null;
            let errorExpressionArg = null;
            let errorExpression = null;
            switch (expr.arguments.length) {
                case 4:
                    const chunkNameExpr = this.evaluateExpression(expr.arguments[3]);
                    if (!chunkNameExpr.isString()) {
                        return;
                    }
                    chunkNameRange = chunkNameExpr.range;
                    chunkName = chunkNameExpr.string;
                // falls through
                case 3:
                    errorExpressionArg = expr.arguments[2];
                    errorExpression = getFunctionExpression(errorExpressionArg);

                    if (!errorExpression && !chunkName) {
                        const chunkNameExpr = this.evaluateExpression(expr.arguments[2]);
                        if (!chunkNameExpr.isString()) {
                            return;
                        }
                        chunkNameRange = chunkNameExpr.range;
                        chunkName = chunkNameExpr.string;
                    }
                // falls through
                case 2:
                    const dependenciesExpr = this.evaluateExpression(expr.arguments[0]);
                    const dependenciesItems = dependenciesExpr.isArray() ? dependenciesExpr.items : [dependenciesExpr];
                    const successExpressionArg = expr.arguments[1];
                    const successExpression = getFunctionExpression(successExpressionArg);

                    if (successExpression) {
                        this.walkExpressions(successExpression.expressions);
                    }
                    if (errorExpression) {
                        this.walkExpressions(errorExpression.expressions);
                    }

                    const dep = new RequireEnsureDependenciesBlock(
                        expr,
                        successExpression ? successExpression.fn : successExpressionArg,
                        errorExpression ? errorExpression.fn : errorExpressionArg,
                        chunkName,
                        chunkNameRange,
                        this.state.module,
                        expr.loc
                    );
                    const old = this.state.current;
                    this.state.current = dep;
                    try {
                        let failed = false;
                        this.inScope([], () => {
                            dependenciesItems.forEach(ee => {
                                if (ee.isString()) {
                                    const edep = new RequireEnsureItemDependency(ee.string);
                                    edep.loc = dep.loc;
                                    dep.addDependency(edep);
                                }
                                else {
                                    failed = true;
                                }
                            });
                        });
                        if (failed) {
                            return;
                        }
                        if (successExpression) {
                            if (successExpression.fn.body.type === 'BlockStatement') {
                                this.walkStatement(successExpression.fn.body);
                            } else {
                                this.walkExpression(successExpression.fn.body);
                            }
                        }
                        old.addBlock(dep);
                    } finally {
                        this.state.current = old;
                    }
                    if (!successExpression) {
                        this.walkExpression(successExpressionArg);
                    }
                    if (errorExpression) {
                        if (errorExpression.fn.body.type === 'BlockStatement') {
                            this.walkStatement(errorExpression.fn.body);
                        } else {
                            this.walkExpression(errorExpression.fn.body);
                        }
                    } else if (errorExpressionArg) {
                        this.walkExpression(errorExpressionArg);
                    }
                    return true;
            }
        });
    }

}

export = RequireEnsureDependenciesBlockParserPlugin
