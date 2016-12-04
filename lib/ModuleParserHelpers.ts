/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Parser = require('./Parser')
import DependenciesBlock = require('./DependenciesBlock')
import Dependency = require('./Dependency')

export function addParsedVariable(parser: Parser, name: string, expression: string) {
    if (!parser.state.current.addVariable) {
        return false;
    }
    const deps: Dependency[] = [];
    parser.parse(expression, {
        current: {
            addDependency(dep) {
                dep.userRequest = name;
                deps.push(dep);
            }
        } as DependenciesBlock,
        module: parser.state.module
    });
    parser.state.current.addVariable(name, expression, deps);
    return true;
}
