/**
 * Created by cloud on 16-10-20.
 */
interface AjvJsonSchema extends JsonSchema {
    typeof: string;
    instanceof: string;
    range: number[];
    exclusiveRange: number[];
    propertyNames: {};
    regexp: RegExp;
}
