/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import HarmonyImportDependency = require('./HarmonyImportDependency');
import HarmonyImportSpecifierDependency = require('./HarmonyImportSpecifierDependency');
import HarmonyAcceptImportDependency = require('./HarmonyAcceptImportDependency');
import HarmonyAcceptDependency = require('./HarmonyAcceptDependency');
import HarmonyModulesHelpers = require('./HarmonyModulesHelpers');
import Parser = require('../Parser')
import {
    ImportDeclaration,
    Identifier,
    MemberExpression,
    CallExpression,
    SimpleLiteral,
    FunctionExpression
} from 'estree'

class HarmonyImportDependencyParserPlugin {
    apply(parser: Parser) {
        parser.plugin('import', function (this: Parser, statement: ImportDeclaration, source: string) {

            const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
            dep.loc = statement.loc;
            this.state.current.addDependency(dep);
            this.state.lastHarmonyImport = dep;
            return true;
        })
        parser.plugin('import specifier', function (
            this: Parser, statement: ImportDeclaration, source: string,
            id: string, name: string
        ) {

            this.scope.definitions.length--;
            this.scope.renames[`$${name}`] = 'imported var';
            if (!this.state.harmonySpecifier) {
                this.state.harmonySpecifier = {};
            }
            this.state.harmonySpecifier[`$${name}`] = [
                this.state.lastHarmonyImport,
                HarmonyModulesHelpers.getModuleVar(this.state, source),
                id
            ];
            return true;
        })
        parser.plugin('expression imported var', function (this: Parser, expr: Identifier) {

            const name = expr.name;
            const settings = this.state.harmonySpecifier[`$${name}`];
            const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range);
            dep.shorthand = this.scope.inShorthand;
            dep.directImport = true;
            dep.loc = expr.loc;
            this.state.current.addDependency(dep);
            return true;
        })
        parser.plugin('expression imported var.*', function (
            this: Parser,
            expr: MemberExpression & { object: Identifier }
        ) {

            const name = expr.object.name;
            const settings = this.state.harmonySpecifier[`$${name}`];
            if (settings[2] !== null) {
                return false;
            }
            const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], (expr.property as Identifier).name || ((expr.property as SimpleLiteral).value as string), name, expr.range);
            dep.shorthand = this.scope.inShorthand;
            dep.directImport = false;
            dep.loc = expr.loc;
            this.state.current.addDependency(dep);
            return true;
        })
        parser.plugin('call imported var', function (this: Parser, expr: CallExpression) {

            const args = expr.arguments;
            const fullExpr = expr;
            const exprCalle = expr.callee as Identifier;
            const name = exprCalle.name;
            const settings = this.state.harmonySpecifier[`$${name}`];
            const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, exprCalle.range);
            dep.directImport = true;
            dep.callArgs = args;
            dep.call = fullExpr;
            dep.loc = exprCalle.loc;
            this.state.current.addDependency(dep);
            if (args) {
                this.walkExpressions(args);
            }
            return true;
        })
        parser.plugin('hot accept callback', function (this: Parser, expr: FunctionExpression, requests: string[]) {

            const dependencies = requests
                .filter(function (request) {
                    return HarmonyModulesHelpers.checkModuleVar(this.state, request);
                }, this)
                .map(function (request) {
                    const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(this.state, request), expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return dep;
                }, this);
            if (dependencies.length > 0) {
                const dep = new HarmonyAcceptDependency(expr.range, dependencies, true);
                dep.loc = expr.loc;
                this.state.current.addDependency(dep);
            }
        })
        parser.plugin('hot accept without callback', function (this: Parser, expr: CallExpression, requests: string[]) {
            const dependencies = requests
                .filter(function (request) {
                    return HarmonyModulesHelpers.checkModuleVar(this.state, request);
                }, this)
                .map(function (request) {
                    const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(this.state, request), expr.range);
                    dep.loc = expr.loc;
                    this.state.current.addDependency(dep);
                    return dep;
                }, this);

            if (dependencies.length > 0) {
                const dep = new HarmonyAcceptDependency(expr.range, dependencies, false);
                dep.loc = expr.loc;
                this.state.current.addDependency(dep);
            }
        })
    }

}
export = HarmonyImportDependencyParserPlugin;
