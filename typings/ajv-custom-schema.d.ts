/**
 * Created by cloud on 16-10-20.
 */
interface AjvJsonSchema extends JsonSchema<AjvJsonSchema> {
    typeof: string;
    instanceof: string;
    range: number[];
    exclusiveRange: number[];
    propertyNames: Function;
    regexp: RegExp;
}
