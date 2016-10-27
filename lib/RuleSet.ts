/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/*
 <rules>: <rule>
 <rules>: [<rule>]
 <rule>: {
 resource: {
 test: <condition>,
 include: <condition>,
 exclude: <condition>,
 },
 resource: <condition>, -> resource.test
 test: <condition>, -> resource.test
 include: <condition>, -> resource.include
 exclude: <condition>, -> resource.exclude
 issuer: {
 test: <condition>,
 include: <condition>,
 exclude: <condition>,
 },
 issuer: <condition>, -> issuer.test
 use: "loader", -> use[0].loader
 loader: <>, -> use[0].loader
 loaders: <>, -> use
 options: {}, -> use[0].options,
 query: {}, -> options
 parser: {},
 use: [
 "loader" -> use[x].loader
 ],
 use: [
 {
 loader: "loader",
 options: {}
 }
 ],
 rules: [
 <rule>
 ],
 oneOf: [
 <rule>
 ]
 }

 <condition>: /regExp/
 <condition>: function(arg) {}
 <condition>: "starting"
 <condition>: [<condition>] // or
 <condition>: { and: [<condition>] }
 <condition>: { or: [<condition>] }
 <condition>: { not: [<condition>] }
 <condition>: { test: <condition>, include: <condition>, exclude: <codition> }


 normalized:

 {
 resource: function(),
 issuer: function(),
 use: [
 {
 loader: string,
 options: string,
 <any>: <any>
 }
 ],
 rules: [<rule>],
 oneOf: [<rule>],
 <any>: <any>,
 }

 */

class RuleSet {
    constructor(rules) {
        this.rules = RuleSet.normalizeRules(rules);
    }

    static normalizeRules(rules) {
        if (Array.isArray(rules)) {
            return rules.map(rule => RuleSet.normalizeRule(rule));
        }
        else if (rules) {
            return [RuleSet.normalizeRule(rules)];
        }
        else {
            return [];
        }
    }

    static normalizeRule(rule) {
        if (typeof rule === 'string') {
            return {
                use: [
                    {
                        loader: rule
                    }
                ]
            };
        }
        if (!rule) {
            throw new Error('Unexcepted null when object was expected as rule');
        }
        if (typeof rule !== 'object') {
            throw new Error(`Unexcepted ${typeof rule} when object was expected as rule (${rule})`);
        }

        const newRule = {};
        let useSource;
        let resourceSource;

        if (rule.test || rule.include || rule.exclude) {
            checkResourceSource('test + include + exclude');
            newRule.resource = RuleSet.normalizeCondition({
                test: rule.test,
                include: rule.include,
                exclude: rule.exclude
            });
        }

        if (rule.resource) {
            checkResourceSource('resource');
            newRule.resource = RuleSet.normalizeCondition(rule.resource);
        }

        if (rule.issuer) {
            newRule.issuer = RuleSet.normalizeCondition(rule.issuer);
        }

        if (rule.loader && rule.loaders) {
            throw new Error('Provided loader and loaders for rule');
        }

        const loader = rule.loaders || rule.loader;
        if (typeof loader === 'string' && !rule.options && !rule.query) {
            checkUseSource('loader');
            newRule.use = RuleSet.normalizeUse(loader.split('!'));
        }
        else if (typeof loader === 'string' && (rule.options || rule.query)) {
            checkUseSource('loader + options/query');
            newRule.use = RuleSet.normalizeUse({
                loader,
                options: rule.options,
                query: rule.query
            });
        }
        else if (loader && (rule.options || rule.query)) {
            throw new Error('options/query cannot be used with loaders');
        }
        else if (loader) {
            checkUseSource('loaders');
            newRule.use = RuleSet.normalizeUse(loader);
        }

        if (rule.use) {
            checkUseSource('use');
            newRule.use = RuleSet.normalizeUse(rule.use);
        }

        if (rule.rules) {
            newRule.rules = RuleSet.normalizeRules(rule.rules);
        }

        if (rule.oneOf) {
            newRule.oneOf = RuleSet.normalizeRules(rule.oneOf);
        }

        const keys = Object.keys(rule)
            .filter(key =>
                ![
                    'resource', 'test', 'include', 'exclude', 'issuer', 'loader',
                    'options', 'query', 'loaders', 'use', 'rules', 'oneOf'
                ].includes(key)
            );

        keys.forEach(key => {
            newRule[key] = rule[key];
        });

        function checkUseSource(newSource) {
            if (useSource && useSource !== newSource) {
                throw new Error(`Rule can only have one result source (provided ${newSource} and ${useSource})`);
            }
            useSource = newSource;
        }

        function checkResourceSource(newSource) {
            if (resourceSource && resourceSource !== newSource) {
                throw new Error(`Rule can only have one resource source (provided ${newSource} and ${resourceSource})`);
            }
            resourceSource = newSource;
        }

        return newRule;
    }

    static normalizeUse(use) {
        if (Array.isArray(use)) {
            return use.map(RuleSet.normalizeUse).reduce((arr, items) => arr.concat(items), []);
        }
        return [RuleSet.normalizeUseItem(use)];
    }

    static normalizeUseItem(item) {
        if (typeof item === 'function') {
            return item;
        }

        if (typeof item === 'string') {
            const idx = item.indexOf('?');
            if (idx >= 0) {
                return {
                    loader: item.substr(0, idx),
                    options: item.substr(idx + 1)
                };
            }
            return {
                loader: item
            };
        }

        const newItem = {};

        if (item.options && item.query) {
            throw new Error('Provided options and query in use');
        }

        if (!item.loader) {
            throw new Error('No loader specified');
        }

        newItem.options = item.options || item.query;

        const keys = Object.keys(item).filter(key => !['options', 'query'].includes(key));

        keys.forEach(key => {
            newItem[key] = item[key];
        });

        return newItem;
    }

    static normalizeCondition(condition) {
        if (!condition) {
            throw new Error('Expected condition but got falsy value');
        }
        if (typeof condition === 'string') {
            return str => str.indexOf(condition) === 0;
        }
        if (typeof condition === 'function') {
            return condition;
        }
        if (condition instanceof RegExp) {
            return condition.test.bind(condition);
        }
        if (Array.isArray(condition)) {
            const items = condition.map(c => RuleSet.normalizeCondition(c));
            return orMatcher(items);
        }
        if (typeof condition !== 'object') {
            throw Error(`Unexcepted ${typeof condition} when condition was expected (${condition})`);
        }
        const matchers = [];
        Object.keys(condition)
            .forEach(key => {
                const value = condition[key];
                switch (key) {
                    case 'or':
                    case 'include':
                    case 'test':
                        if (value) {
                            matchers.push(RuleSet.normalizeCondition(value));
                        }
                        break;
                    case 'and':
                        if (value) {
                            const items = value.map(c => RuleSet.normalizeCondition(c));
                            matchers.push(andMatcher(items));
                        }
                        break;
                    case 'not':
                    case 'exclude':
                        if (value) {
                            const matcher = RuleSet.normalizeCondition(value);
                            matchers.push(notMatcher(matcher));
                        }
                        break;
                    default:
                        throw new Error(`Unexcepted property ${key} in condition`);
                }
            });
        if (matchers.length === 0) {
            throw new Error(`Unexcepted condition but got ${condition}`);
        }
        if (matchers.length === 1) {
            return matchers[0];
        }
        return andMatcher(matchers);
    }

    exec(data) {
        const result = [];
        this._run(data, {
            rules: this.rules
        }, result);
        return result;
    }

    _run(data, rule, result) {
        // test conditions
        if (rule.resource && !data.resource) {
            return false;
        }
        if (rule.issuer && !data.issuer) {
            return false;
        }
        if (rule.resource && !rule.resource(data.resource)) {
            return false;
        }
        if (data.issuer && rule.issuer && !rule.issuer(data.issuer)) {
            return false;
        }

        // apply
        const keys = Object.keys(rule)
            .filter(key => !['resource', 'issuer', 'rules', 'oneOf', 'use', 'enforce'].includes(key));

        keys.forEach(key => {
            result.push({
                type: key,
                value: rule[key]
            });
        });

        if (rule.use) {
            rule.use.forEach(use => {
                result.push({
                    type: 'use',
                    value: typeof use === 'function' ? use(data) : use,
                    enforce: rule.enforce
                });
            });
        }

        if (rule.rules) {
            for (let item of rule.rules) {
                this._run(data, item, result)
            }
        }

        if (rule.oneOf) {
            for (let item of rule.oneOf) {
                if (this._run(data, item, result)) {
                    break;
                }
            }
        }

        return true;
    }
}

export = RuleSet;

function notMatcher(matcher) {
    return (str) => !matcher(str);
}

function orMatcher(items) {
    return (str) => {
        for (let item of items) {
            if (item(str)) {
                return true;
            }
        }
        return false;
    };
}

function andMatcher(items) {
    return (str) => {
        for (let item of items) {
            if (!item(str)) {
                return false;
            }
        }
        return true;
    };
}
