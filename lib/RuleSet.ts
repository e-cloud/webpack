/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
// @formatter:off
/**
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
    resourceQuery: <condition>,
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
<condition>: { test: <condition>, include: <condition>, exclude: <condition> }


normalized:

{
    resource: function(),
    resourceQuery: function(),
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
// @formatter:on
import { PlainObject, ParserOptions } from '../typings/webpack-types'

interface ConditionFunc {
    (arg: string): boolean
}

interface AndCondition {
    and: ConditionArray
}

interface OrCondition {
    or: ConditionArray
}

interface NotCondition {
    not: ConditionArray
}

interface DetailCondition {
    test: Condition
    include: Condition
    exclude: Condition
}

interface ConditionArray extends Array<Condition> {}

type Condition = RegExp | string | ConditionFunc | ConditionArray | AndCondition | OrCondition | NotCondition | DetailCondition

type RuleQuery = {
    ident?: string
} | string

interface UseItemObject {
    [other: string]: any
    loader: string
    options: RuleQuery
    query: RuleQuery
}

type UseItem = string | UseItemObject

interface Rule {
    enforce?: 'pre' | 'post'
    exclude?: Condition
    include?: Condition
    issuer?: DetailCondition | ConditionFunc
    loader?: string
    loaders?: string | string[]
    oneOf?: Rule[]
    options?: PlainObject
    parser: ParserOptions
    query?: PlainObject
    resource?: AndCondition | OrCondition | NotCondition | ConditionArray
    resourceQuery?: Condition
    rules?: Rule[]
    test?: Condition
    use?: UseItem[]
}

interface RuleExecResult {
    enforce?: string
    type: string
    value: any
}

interface RuleExecData {
    issuer?: string
    resource: string
    resourceQuery?: string
}

interface NormalizedUseItemObject {
    loader: string
    options?: RuleQuery
    [other: string]: any
}
interface NormalizedUseFunc {
    (data: RuleExecData): any
}

type NormalizedUseItem = NormalizedUseFunc | NormalizedUseItemObject

interface NormalizedRule {
    enforce?: string
    issuer?: ConditionFunc
    oneOf?: NormalizedRule[]
    resource?: ConditionFunc
    resourceQuery?: ConditionFunc
    rules: NormalizedRule[]
    use?: NormalizedUseItem[]
}

interface RuleSetRefs {
    [id: string]: {
        ident: string
    }
}

class RuleSet {
    rules: NormalizedRule[]
    references: RuleSetRefs

    constructor(rules: (Rule | string)[]) {
        this.references = {};
        this.rules = RuleSet.normalizeRules(rules, this.references);
    }

    static normalizeRules(rules: (Rule | string)[], refs: RuleSetRefs): NormalizedRule[] {
        if (Array.isArray(rules)) {
            return rules.map(rule => RuleSet.normalizeRule(rule, refs));
        }
        else if (rules) {
            return [RuleSet.normalizeRule(rules, refs)];
        }
        else {
            return [];
        }
    }

    static normalizeRule(rule: Rule | string, refs: RuleSetRefs): NormalizedRule {
        if (typeof rule === 'string') {
            return {
                use: [
                    {
                        loader: rule
                    }
                ]
            } as NormalizedRule;
        }
        if (!rule) {
            throw new Error('Unexcepted null when object was expected as rule');
        }
        if (typeof rule !== 'object') {
            throw new Error(`Unexcepted ${typeof rule} when object was expected as rule (${rule})`);
        }

        const newRule = {} as NormalizedRule;
        let useSource: string;
        let resourceSource: string;

        if (rule.test || rule.include || rule.exclude) {
            checkResourceSource('test + include + exclude');
            let condition = {
                test: rule.test,
                include: rule.include,
                exclude: rule.exclude
            };
            try {
                newRule.resource = RuleSet.normalizeCondition(condition);
            } catch (error) {
                throw new Error(RuleSet.buildErrorMessage(condition, error));
            }
        }

        if (rule.resource) {
            checkResourceSource('resource');
            try {
                newRule.resource = RuleSet.normalizeCondition(rule.resource);
            } catch (error) {
                throw new Error(RuleSet.buildErrorMessage(rule.resource, error));
            }
        }

        if (rule.resourceQuery) {
            try {
                newRule.resourceQuery = RuleSet.normalizeCondition(rule.resourceQuery);
            } catch (error) {
                throw new Error(RuleSet.buildErrorMessage(rule.resourceQuery, error));
            }
        }

        if (rule.issuer) {
            try {
                newRule.issuer = RuleSet.normalizeCondition(rule.issuer);
            } catch (error) {
                throw new Error(RuleSet.buildErrorMessage(rule.issuer, error));
            }
        }

        if (rule.loader && rule.loaders) {
            throw new Error(RuleSet.buildErrorMessage(rule, new Error('Provided loader and loaders for rule (use only one of them)')));

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
            throw new Error(RuleSet.buildErrorMessage(rule, new Error('options/query cannot be used with loaders (use options for each array item)')));
        }
        else if (loader) {
            checkUseSource('loaders');
            newRule.use = RuleSet.normalizeUse(loader);
        }
        else if (rule.options || rule.query) {
            throw new Error(RuleSet.buildErrorMessage(rule, new Error('options/query provided without loader (use loader + options)')));
        }

        if (rule.use) {
            checkUseSource('use');
            newRule.use = RuleSet.normalizeUse(rule.use);
        }

        if (rule.rules) {
            newRule.rules = RuleSet.normalizeRules(rule.rules, refs);
        }

        if (rule.oneOf) {
            newRule.oneOf = RuleSet.normalizeRules(rule.oneOf, refs);
        }

        const keys = Object.keys(rule)
            .filter(key =>
                ![
                    'resource', 'resourceQuery', 'test', 'include', 'exclude', 'issuer',
                    'loader', 'options', 'query', 'loaders', 'use', 'rules', 'oneOf'
                ].includes(key)
            );

        keys.forEach(key => {
            newRule[key] = rule[key];
        });

        function checkUseSource(newSource: string) {
            if (useSource && useSource !== newSource) {
                throw new Error(RuleSet.buildErrorMessage(rule, new Error(`Rule can only have one result source (provided ${newSource} and ${useSource})`)));
            }
            useSource = newSource;
        }

        function checkResourceSource(newSource: string) {
            if (resourceSource && resourceSource !== newSource) {
                throw new Error(RuleSet.buildErrorMessage(rule, new Error(`Rule can only have one resource source (provided ${newSource} and ${resourceSource})`)));
            }
            resourceSource = newSource;
        }

        if (Array.isArray(newRule.use)) {
            newRule.use.forEach(function (item: NormalizedUseItemObject) {
                if (typeof item.options === 'object' && item.options && item.options.ident) {
                    refs[`$${item.options.ident}`] = item.options as { ident: string };
                }
            });
        }

        return newRule;
    }

    static normalizeUse(use: UseItem | UseItem[]): NormalizedUseItem[] {
        if (Array.isArray(use)) {
            return use.map(RuleSet.normalizeUse).reduce((arr, items) => arr.concat(items), []);
        }
        return [RuleSet.normalizeUseItem(use)];
    }

    static normalizeUseItemFunction(use: NormalizedUseFunc, data: RuleExecData) {
        const result = use(data);
        if (typeof result === 'string') {
            return RuleSet.normalizeUseItem(result);
        }
        return result;
    }

    static normalizeUseItemString(useItemString: string) {
        const idx = useItemString.indexOf('?');
        if (idx >= 0) {
            return {
                loader: useItemString.substr(0, idx),
                options: useItemString.substr(idx + 1)
            };
        }
        return {
            loader: useItemString
        };
    }

    static normalizeUseItem(item: UseItem): NormalizedUseItem {
        if (typeof item === 'function') {
            return item;
        }

        if (typeof item === 'string') {
            return RuleSet.normalizeUseItemString(item);
        }

        const newItem = {} as NormalizedUseItemObject;

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

    static normalizeCondition(condition: Condition): ConditionFunc {
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
        const matchers: any = [];
        Object.keys(condition)
            .forEach(key => {
                const value: any = condition[key];
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
                            const items = (value as ConditionArray).map(c => RuleSet.normalizeCondition(c));
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

    static buildErrorMessage(condition: Rule | Condition, error: Error) {
        const conditionAsText = JSON.stringify(
            condition,
            (key, value) => value === undefined ? 'undefined' : value,
            2
        )
        return `${error.message} in ${conditionAsText}`;
    }

    exec(data: RuleExecData) {
        const result: RuleExecResult[] = [];
        this._run(data, {
            rules: this.rules
        }, result);
        return result;
    }

    _run(data: RuleExecData, rule: NormalizedRule, result: RuleExecResult[]) {
        // test conditions
        if (rule.resource && !data.resource) {
            return false;
        }
        if (rule.resourceQuery && !data.resourceQuery) {
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
        if (data.resourceQuery && rule.resourceQuery && !rule.resourceQuery(data.resourceQuery)) {
            return false;
        }

        // apply
        const keys = Object.keys(rule)
            .filter(key => !['resource', 'resourceQuery', 'issuer', 'rules', 'oneOf', 'use', 'enforce'].includes(key));

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
                    value: typeof use === 'function' ? RuleSet.normalizeUseItemFunction(use, data) : use,
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

    findOptionsByIdent(ident: string) {
        const options = this.references[`$${ident}`];
        if (!options) {
            throw new Error(`Can't find options with ident '${ident}'`);
        }
        return options;
    }
}

export = RuleSet;

function notMatcher(matcher: ConditionFunc) {
    return (str: string) => !matcher(str);
}

function orMatcher(items: ConditionFunc[]) {
    return (str: string) => {
        for (let item of items) {
            if (item(str)) {
                return true;
            }
        }
        return false;
    };
}

function andMatcher(items: ConditionFunc[]) {
    return (str: string) => {
        for (let item of items) {
            if (!item(str)) {
                return false;
            }
        }
        return true;
    };
}
