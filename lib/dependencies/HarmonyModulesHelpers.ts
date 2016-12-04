/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Module = require('../Module')
import HarmonyExportSpecifierDependency = require('./HarmonyExportSpecifierDependency')
import HarmonyExportImportedSpecifierDependency = require('./HarmonyExportImportedSpecifierDependency')
import HarmonyExportHeaderDependency = require('./HarmonyExportHeaderDependency')
import HarmonyExportExpressionDependency = require('./HarmonyExportExpressionDependency')
import Dependency = require('../Dependency')
import { ParserState } from '../../typings/webpack-types'

export function getModuleVar(state: ParserState, request: string) {
    if (!state.harmonyModules) {
        state.harmonyModules = [];
    }
    let idx = state.harmonyModules.indexOf(request);
    if (idx < 0) {
        idx = state.harmonyModules.length;
        state.harmonyModules.push(request);
    }
    return `__WEBPACK_IMPORTED_MODULE_${idx}_${request.replace(/[^A-Za-z0-9_]/g, '_').replace(/__+/g, '_')}__`;
}

export function getNewModuleVar(state: ParserState, request: string) {
    if (state.harmonyModules && state.harmonyModules.includes(request)) {
        return null;
    }
    return getModuleVar(state, request);
}

export function checkModuleVar(state: ParserState, request: string) {
    if (!state.harmonyModules || !state.harmonyModules.includes(request)) {
        return null;
    }
    return getModuleVar(state, request);
}

// checks if an harmory dependency is active in a module according to
// precedence rules.
export function isActive(module: Module, depInQuestion: HarmonyExportDependency) {
    const desc = depInQuestion.describeHarmonyExport();
    if (!desc.exportedName) {
        return true;
    }
    let before = true;
    for (let i = 0; i < module.dependencies.length; i++) {
        const dep = module.dependencies[i] as HarmonyExportDependency;
        if (dep === depInQuestion) {
            before = false;
            continue;
        }
        if (!dep.describeHarmonyExport) {
            continue;
        }
        const d = dep.describeHarmonyExport();
        if (!d || !d.exportedName) {
            continue;
        }
        if (d.exportedName === desc.exportedName) {
            if (d.precedence < desc.precedence) {
                return false;
            }
            if (d.precedence === desc.precedence && !before) {
                return false;
            }
        }
    }
    return true;
}

type HarmonyExportDependency = HarmonyExportSpecifierDependency | HarmonyExportImportedSpecifierDependency | HarmonyExportExpressionDependency

// get a list of named exports defined in a module
// doesn't include * reexports.
export function getActiveExports(module: Module): string[] {
    // todo: there is no activeExports assignment at all across the repo
    if (module.activeExports) {
        return module.activeExports;
    }
    return module.dependencies.reduce(function (arr, dep: HarmonyExportDependency) {
        if (!dep.describeHarmonyExport) {
            return arr;
        }
        const d = dep.describeHarmonyExport();
        if (!d) {
            return arr;
        }
        const name = d.exportedName;
        if (!name || arr.includes(name)) {
            return arr;
        }
        arr.push(name);
        return arr;
    }, []);
}
