/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
import SizeFormatHelpers = require('../SizeFormatHelpers');
import Compilation = require('../Compilation')
import Entrypoint = require('../Entrypoint')

class EntrypointsOverSizeLimitWarning extends Error {
    constructor(public entrypoints: Entrypoint[], compilation: Compilation, entrypointLimit: number) {
        super();
        Error.captureStackTrace(this, EntrypointsOverSizeLimitWarning);
        this.name = 'EntrypointsOverSizeLimitWarning';

        const entrypointCompilation = compilation;
        const entrypointList = this.entrypoints.map(entrypoint =>
                `\n  ${entrypoint.name} (${SizeFormatHelpers.formatSize(entrypoint.getSize(entrypointCompilation))})\n${entrypoint.getFiles()
                    .map((filename, index) => '      ' + entrypoint.getFiles()[index] + '\n')
                    .join('')}`
            )
            .join('');

        this.message = `entrypoint size limit: The following entrypoint(s) combined asset size exceeds the recommended limit (${SizeFormatHelpers.formatSize(entrypointLimit)}). This can impact web performance.\nEntrypoints:${entrypointList}`;
    }
}

export = EntrypointsOverSizeLimitWarning;
