/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AbstractPlugin = require('../AbstractPlugin');

import HarmonyImportDependency = require('./HarmonyImportDependency');
import HarmonyImportSpecifierDependency = require('./HarmonyImportSpecifierDependency');
import HarmonyAcceptImportDependency = require('./HarmonyAcceptImportDependency');
import HarmonyAcceptDependency = require('./HarmonyAcceptDependency');
import HarmonyModulesHelpers = require('./HarmonyModulesHelpers');

export = AbstractPlugin.create({
    'import'(statement, source) {
        const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(this.state, source), statement.range);
        dep.loc = statement.loc;
        this.state.current.addDependency(dep);
        this.state.lastHarmonyImport = dep;
        this.state.module.strict = true;
        return true;
    },
    'import specifier'(statement, source, id, name) {
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
    },
    'expression imported var'(expr) {
        const name = expr.name;
        const settings = this.state.harmonySpecifier[`$${name}`];
        const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range);
        dep.shorthand = this.scope.inShorthand;
        dep.directImport = true;
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        return true;
    },
    'expression imported var.*'(expr) {
        const name = expr.object.name;
        const settings = this.state.harmonySpecifier[`$${name}`];
        if (settings[2] !== null) {
            return false;
        }
        const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], expr.property.name, name, expr.range);
        dep.shorthand = this.scope.inShorthand;
        dep.directImport = false;
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        return true;
    },
    'call imported var'(expr) {
        const args = expr.arguments;
        const fullExpr = expr;
        expr = expr.callee;
        const name = expr.name;
        const settings = this.state.harmonySpecifier[`$${name}`];
        const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range);
        dep.directImport = true;
        dep.callArgs = args;
        dep.call = fullExpr;
        dep.loc = expr.loc;
        this.state.current.addDependency(dep);
        if (args) {
            this.walkExpressions(args);
        }
        return true;
    },
    'hot accept callback'(expr, requests) {
        const dependencies = requests.filter(function (request) {
            return HarmonyModulesHelpers.checkModuleVar(this.state, request);
        }, this).map(function (request) {
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
    },
    'hot accept without callback'(expr, requests) {
        const dependencies = requests.filter(function (request) {
            return HarmonyModulesHelpers.checkModuleVar(this.state, request);
        }, this).map(function (request) {
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
    }
});
