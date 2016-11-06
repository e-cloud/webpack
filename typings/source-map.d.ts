import { RawSource } from 'webpack-sources'

declare module 'webpack-sources' {
    export interface Source {
        __EvalSourceMapDevToolData: RawSource
    }
}
