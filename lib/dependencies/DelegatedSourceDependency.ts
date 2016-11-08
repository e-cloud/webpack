/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class DelegatedSourceDependency extends ModuleDependency {
}

DelegatedSourceDependency.prototype.type = 'delegated source';

export = DelegatedSourceDependency;
