/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class TemplateArgumentDependency {
	constructor(name, dep) {
		this.name = name;
		this.dep = dep;
	}

	updateHash(hash) {
		hash.update(this.name);
	}

	static Template() {
	}
}

export = TemplateArgumentDependency;

TemplateArgumentDependency.prototype.constructor = TemplateArgumentDependency;
TemplateArgumentDependency.prototype.type = 'template argument';

TemplateArgumentDependency.Template.prototype.apply = function (
	dep, source, outputOptions, requestShortener,
	dependencyTemplates
) {
	const d = dep.dep;
	const template = dependencyTemplates.get(d.constructor);
	if (!template) {
		throw new Error(`No template for dependency: ${d.constructor.name}`);
	}
	if (!template.applyAsTemplateArgument) {
		throw new Error(`Template cannot be applied as TemplateArgument: ${d.constructor.name}`);
	}
	return template.applyAsTemplateArgument(dep.name, d, source, outputOptions, requestShortener, dependencyTemplates);
};
