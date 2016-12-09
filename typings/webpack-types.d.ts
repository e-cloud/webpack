import NormalModuleFactory = require('../lib/NormalModuleFactory')
import ContextModuleFactory = require('../lib/ContextModuleFactory')
import Tapable = require('tapable')
import ContextDependency = require('../lib/dependencies/ContextDependency')
import ModuleDependency = require('../lib/dependencies/ModuleDependency')
import Module = require('../lib/Module')
import Compilation = require('../lib/Compilation')
import Compiler = require('../lib/Compiler')
import Parser = require('../lib/Parser')
import Dependency = require('../lib/Dependency')
import SourceMap = require('source-map')
import RawSourceMap = SourceMap.RawSourceMap
import Stats = require('../lib/Stats')
import { HexBase64Latin1Encoding } from 'crypto'
import DependenciesBlock = require('../lib/DependenciesBlock')
import LocalModule = require('../lib/dependencies/LocalModule')
import HarmonyImportDependency = require('../lib/dependencies/HarmonyImportDependency')
import Chunk = require('../lib/Chunk');
import fs = require('fs')

declare interface Dictionary<T> {
    [prop: string]: T;
}

declare interface WebpackError {
    chunk?: Chunk
    file?: string
    module?: Module
    message: string
    details?: string
    missing?: string[]
    dependencies?: Dependency[]
    origin?: Module
}

declare interface PlainObject extends Dictionary<any> {
}

declare interface CompilationParams {
    compilationDependencies: string[];
    contextModuleFactory: ContextModuleFactory;
    normalModuleFactory: NormalModuleFactory;
    [name: string]: any
}

declare type Entry = string | string[] | Dictionary<string | string[]>

declare interface Rule {
    // TODO: Type this from RuleSet.ts
}

declare interface ModuleOptions {
    exprContextCritical?: boolean;
    exprContextRecursive?: boolean;
    exprContextRegExp?: RegExp;
    exprContextRequest?: string;
    /** A RegExp or an array of RegExps. Don’t parse files matching. */
    noParse?: RegExp | RegExp[];
    rules: Rule[];
    unknownContextCritical?: boolean;
    unknownContextRecursive?: boolean;
    unknownContextRegExp?: RegExp;
    unknownContextRequest?: string;
    wrappedContextCritical?: boolean;
    wrappedContextRecursive?: boolean;
    wrappedContextRegExp?: RegExp;
}

declare interface ResolveOptions {
    alias?: Dictionary<string> | {
        alias: string;
        name: string;
        onlyModules: boolean;
    }[];
    aliasFields: string[];
    cachePredicate: (request: string) => boolean;
    descriptionFiles: string[];
    /**
     * An array of extensions that should be used to resolve modules.
     * For example, in order to discover CoffeeScript files, your array should contain the string ".coffee".
     */
    extensions?: string[];
    enforceExtension: boolean;
    enforceModuleExtension: boolean;
    mainFields: string[];
    mainFiles: string[];
    moduleExtensions: string[];
    modules: string[]
    plugins: Tapable.Plugin[];
    resolver: PlainObject;
    /** Replace modules by other modules or paths. */
    symlinks: boolean;
    unsafeCache?: PlainObject | boolean;
}

declare interface ResolveLoaderOptions extends ResolveOptions {
    /** It describes alternatives for the module name that are tried. */
    moduleTemplates?: string[];
}

declare type ExternalsElement = string | RegExp | ExternalsObject | ExternalsFunction | ExternalsElementArray;

declare interface ExternalsElementArray extends Array<ExternalsElement> {

}

declare interface ExternalsObject extends Dictionary<ExternalsObjectPropValue> {
}

declare interface ExternalsModuleObject {
    amd: string;
    commonjs: string[];
    commonjs2: string
    root: string;
}

declare type ExternalsObjectPropValue = boolean | string | ExternalsModuleObject

declare interface ExternalsFunction {
    (context: string, request: string, callback: (err: Error, value: any, type: string) => void): any;
}

declare interface WatchOptions {
    /** Delay the rebuilt after the first change. Value is a time in ms. */
    aggregateTimeout?: number;
    ignored: string;
    /** true: use polling, number: use polling with specified interval */
    poll?: boolean | number;
}

declare interface NodeOption {
    __dirname?: boolean | string;
    __filename?: boolean | string;
    Buffer?: boolean;
    console?: boolean;
    global?: boolean;
    process?: boolean;
    setImmediate?: boolean;
}

declare interface StatsOptions {
    // Add asset Information
    assets: boolean;
    // Sort assets by a filed
    assetsSort?: string;
    // Add information about cached (not built) modules
    cached?: boolean;
    cachedAssets?: boolean;
    // Add children information
    children?: boolean;
    // Add chunk information (setting this to `false` allows for a less verbose output)
    chunks: boolean;
    // Add built modules information to chunk information
    chunkModules?: boolean;
    // Add the origins of chunks and chunk merging info
    chunkOrigins?: boolean;
    // Sort the chunks by a field
    chunksSort?: string;
    colors?: boolean;
    // Context directory for request shortening
    context?: string;
    entrypoints?: boolean;
    // Add errors
    errors?: boolean;
    // Add details to errors (like resolving log)
    errorDetails: boolean;
    exclude?: string[];
    // Add the hash of the compilation
    hash: boolean;
    // Add built modules information
    modules?: boolean;
    // Sort the modules by a field
    modulesSort?: string;
    // Add public path information
    publicPath?: boolean;
    performance?: boolean;
    providedExports?: boolean;
    // Add information about the reasons why modules are included
    reasons: boolean;
    // Add the source code of modules
    source?: boolean;
    // Add timing information
    timings: boolean;
    usedExports?: boolean;
    // Add webpack version information
    version: boolean;
    // Add warnings
    warnings?: boolean;
}

declare interface DevServerOptions {
    clientLogLevel?: string;
    compress: string;
    contentBase: string | false | string[];
    filename: string;
    headers: any;
    historyApiFallback: boolean | {
        rewrites: any[]
    };
    hot: boolean;
    https: boolean | {
        key: string;
        cert: string;
        ca: string;
    };
    lazy: boolean;
    noInfo: boolean;
    proxy: string | {
        [url: string]: {
            target: string;
            pathRewrite: {
                [url: string]: string;
            };
            secure: boolean;
            byPass: (req: any, res: any, proxyOptions: any) => string;
        };
    };
    publicPath: string;
    quiet: boolean;
    staticOptions: any;
    stats: StatsOptions;
    watchContentBase: boolean;
    watchOptions: WatchOptions;
}

declare type FilenameTemplate = string | FilenameTemplateFunc

declare interface FilenameTemplateFunc {
    (info: FilenameTemplateInfo): string
}

declare interface FilenameTemplateInfo {
    absoluteResourcePath: string;
    allLoaders: string;
    hash: string;
    identifier: string;
    moduleId: number | string;
    query: string;
    resource: string;
    resourcePath: string;
    shortIdentifier: string;
}

declare interface PerformanceOptions {
    maxAssetSize?: number
    maxInitialChunkSize?: number
    hints?
    errorOnHint?: boolean
}

declare interface WebpackOptions {
    /** Set the value of require.amd and define.amd. */
    amd?: { [moduleName: string]: boolean };
    /** Report the first error as a hard error instead of tolerating it. */
    bail?: boolean;
    /** Cache generated modules and chunks to improve performance for multiple incremental builds. */
    cache?: boolean | PlainObject;
    context?: string;
    dependencies?: string[];
    /** Can be used to configure the behaviour of webpack-dev-server when the webpack config is passed to webpack-dev-server CLI. */
    devServer?: DevServerOptions;
    /** Choose a developer tool to enhance debugging. */
    devtool?: 'eval' | 'cheap-eval-source-map' | 'cheap-source-map' | 'cheap-module-eval-source-map' | 'cheap-module-source-map' | 'eval-source-map' | 'source-map' | false;
    entry: Entry;
    /**
     *  Specify dependencies that shouldn’t be resolved by webpack, but should become dependencies of the resulting
     * bundle. The kind of the dependency depends on output.libraryTarget.
     */
    externals?: ExternalsElement | ExternalsElement[];
    inputFileSystem?: AbstractInputFileSystem;
    loader: PlainObject;
    module?: ModuleOptions;
    name?: string;
    /** Include polyfills or mocks for various node stuff */
    node?: NodeOption;
    /** Options affecting the output. */
    output?: WebpackOutputOptions;
    outputFileSystem?: AbstractOutputFileSystem;
    /** Add additional plugins to the compiler. */
    plugins?: Tapable.Plugin;
    /** Capture timing information for each module. */
    profile?: boolean;
    performance?: PerformanceOptions;
    /** Used for recordsInputPath and recordsOutputPath */
    recordsPath?: string;
    /** Load compiler state from a json file. */
    recordsInputPath?: string;
    /** Store compiler state to a json file. */
    recordsOutputPath?: string;
    /** Options affecting the resolving of modules. */
    resolve?: ResolveOptions;
    /** Like resolve but for loaders. */
    resolveLoader?: ResolveLoaderOptions;
    /** Stats options for logging  */
    stats?: StatsOptions | 'none' | 'errors-only' | 'minimal' | 'normal' | 'verbose' | boolean;
    target?: 'web' | 'webworker' | 'node' | 'async-node' | 'node-webkit' | 'atom' | 'electron' | 'electron-main' | 'electron-renderer' | ((compiler: Compiler) => void) | false;
    /** Enter watch mode, which rebuilds on file change. */
    watch?: boolean;
    watchOptions?: WatchOptions;
}

declare interface WebpackOutputOptions {
    auxiliaryComment: AuxiliaryComment;
    /** The filename of non-entry chunks as relative path inside the output.path directory. */
    chunkFilename?: string;
    chunkLoadTimeout: number;
    crossOriginLoading?: string | boolean;
    chunkCallbackName: string;
    /** Similar to output.devtoolModuleFilenameTemplate, but used in the case of duplicate module identifiers. */
    devtoolFallbackModuleFilenameTemplate?: string | ((info: FilenameTemplateInfo) => string);
    /**
     * Enable line to line mapped mode for all/specified modules.
     * Line to line mapped mode uses a simple SourceMap where each line of the generated source is mapped to the same
     * line of the original source. It’s a performance optimization. Only use it if your performance need to be better
     * and you are sure that input lines match which generated lines. true enables it for all modules (not recommended)
     */
    devtoolLineToLine?: boolean | {
        test: string
        exclude: string
        include: string
    };
    /** Filename template string of function for the sources array in a generated SourceMap. */
    devtoolModuleFilenameTemplate?: string | ((info: FilenameTemplateInfo) => string);
    /** The filename of the entry chunk as relative path inside the output.path directory. */
    filename?: string;
    hashDigest: HexBase64Latin1Encoding;
    hashDigestLength: number;
    hashFunction: string;
    hashSalt: string;
    /** The filename of the Hot Update Chunks. They are inside the output.path directory. */
    hotUpdateChunkFilename?: string;
    /** The JSONP function used by webpack for async loading of hot update chunks. */
    hotUpdateFunction?: string;
    /** The filename of the Hot Update Main File. It is inside the output.path directory. */
    hotUpdateMainFilename?: string;
    /** The JSONP function used by webpack for asnyc loading of chunks. */
    jsonpFunction?: Function;
    /** If set, export the bundle as library. output.library is the name. */
    library?: string;
    libraryTarget?: 'var' | 'assign' | 'this' | 'window' | 'global' | 'commonjs' | 'commonjs2' | 'commonjs-module' | 'amd' | 'umd' | 'umd2' | 'jsonp';
    /** The output directory as absolute path (required). */
    path: string;
    /** Include comments with information about the modules. */
    pathinfo?: boolean;
    /** The output.path from the view of the Javascript / HTML page. */
    publicPath?: string;
    /** The filename of the SourceMaps for the JavaScript files. They are inside the output.path directory. */
    sourceMapFilename?: string;
    /** Prefixes every line of the source in the bundle with this string. */
    sourcePrefix?: string;
    /** This option enables cross-origin loading of chunks. */
    strictModuleExceptionHandling: boolean;
    /** If output.libraryTarget is set to umd and output.library is set, setting this to true will name the AMD module. */
    umdNamedDefine?: boolean;
}

declare type AuxiliaryComment = {
    amd?: string;
    commonjs2?: string;
    commonjs?: string;
    root?: string;
} | string;

declare interface Record {
    aggressiveSplits: AggressiveSplit[];
    chunkHashs: {
        [id: number]: string;
    };
    chunkModuleIds: {
        [id: number]: number[];
    };
    chunks: {
        byName: Dictionary<number>;
        byBlocks: Dictionary<number>;
        usedIds: {
            [id: number]: number;
        };
    };
    hash?: string;
    moduleHashs: Dictionary<string>;
    modules: {
        byIdentifier: Dictionary<number>;
        usedIds: Dictionary<number>;
    };
    nextFreeChunkId: number;
    preHash?: string;
    prepreHash?: string;
}

declare interface NMFBeforeResolveResult {
    context: string;
    contextInfo: {
        issuer: string;
    };
    dependencies: [ModuleDependency];
    request: string;
}

declare interface NMFAfterResolveResult {
    context: string;
    dependencies: [ModuleDependency];
    loaders: any[];
    parser: Parser;
    rawRequest: string;
    request: string;
    resource: string;
    userRequest: string;
}

declare interface CMFBeforeResolveResult {
    async: boolean;
    context: string;
    dependencies: [ContextDependency];
    recursive: boolean;
    regExp: RegExp;
    request: string;
}

declare interface CMFAfterResolveResult {
    async: boolean;
    dependencies: [ContextDependency];
    loaders: string;
    recursive: boolean;
    regExp: RegExp;
    resolveDependencies: (
        fs: AbstractInputFileSystem, resource: string, recursive: boolean, regExp: RegExp,
        callback: ErrCallback
    ) => any;
    resource: string;
}

declare interface LoaderContext {
    [prop: string]: any;
    _compilation: Compilation;
    _compiler: Compiler;
    _module: Module;
    emitError(error: string): void;
    emitFile(name: string, content: string, sourceMap: RawSourceMap): void;
    emitWarning(warning: string): void;
    exec(code: string, filename: string): any;
    fs: AbstractInputFileSystem;
    loadModule(request: string, callback: ErrCallback): void;
    options: WebpackOptions;
    resolve(context: string, request: string, callback: ErrCallback): void;
    resolveSync(context: string, request: string): any;
    sourceMap: boolean;
    target: string;
    version: number;
    webpack: boolean;
}

declare interface AggressiveSplit {
    hash?: string;
    id?: number;
    invalid?: boolean;
    modules: string[];
}

declare type SourceRange = [number, number];

declare interface ErrCallback {
    (err?: Error | undefined, ...args: any[]): any;
}

declare interface WatchCallback<StatsClass> {
    (err: Error, stat?: StatsClass): any;
}

declare interface TimeStampMap extends Dictionary<number> {
}

declare interface ParserOptions {
    amd: boolean;
    commonjs: boolean;
    system: boolean;
    harmony: boolean;
    requireInclude: boolean;
    requireEnsure: boolean;
    requireContext: boolean;
    browserify: boolean;
    requireJs: boolean;
    node: false | NodeOption;
    ident: string
    import: boolean
}

declare interface WatchFileSystem {
    watch(
        files: string[],
        dirs: string[],
        missing: string[],
        startTime: number,
        options: WatchOptions,
        callback: ErrCallback,
        callbackUndelayed: (fileName: string, changeTime: number) => any
    ): void
}

declare interface AlternativeModule {
    context: string
    request: string
}

declare interface ParserState {
    compilation?: Compilation
    current: DependenciesBlock
    module: Module
    localModules?: LocalModule[]
    harmonySpecifier?: Dictionary<[HarmonyImportDependency, string, string]>
    lastHarmonyImport?: HarmonyImportDependency
    harmonyModules?: string[]
    options?: WebpackOptions
}

declare interface AbstractStats {
    hasErrors(): boolean
    hasWarnings(): boolean
    toJson(options: StatsOptions, forToString: boolean): any
}

declare interface AbstractInputFileSystem {
    isSync(): boolean;
    purge(what?: string | string[]): void;
    readdir(path: string, callback: (err: NodeJS.ErrnoException, files: string[]) => void): void;
    readFile(filename: string, callback: (err: NodeJS.ErrnoException, data: Buffer) => void): void;
    readJson(path: string, callback: (err: NodeJS.ErrnoException, data: Dictionary<any>) => void): void;
    readlink(path: string, callback?: (err: NodeJS.ErrnoException, linkString: string) => void): void;
    stat(path: string, callback?: (err: NodeJS.ErrnoException, stats: fs.Stats) => void): void;
}

interface AbstractOutputFileSystem {
    join(...paths: string[]): string;
    mkdir(path: string | Buffer, mode: string, callback?: (err?: NodeJS.ErrnoException) => void): void;
    mkdirp(dir: string, cb: (err: any, made: string) => void): void;
    rmdir(path: string | Buffer, callback?: (err?: NodeJS.ErrnoException) => void): void;
    unlink(path: string | Buffer, callback?: (err?: NodeJS.ErrnoException) => void): void;
    writeFile(filename: string, data: any, callback?: (err: NodeJS.ErrnoException) => void): void;
}
