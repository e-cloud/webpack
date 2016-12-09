/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
export function formatSize(size: number) {
    if (size <= 0) {
        return '0 bytes';
    }

    const abbreviations = ['bytes', 'kB', 'MB', 'GB'];
    const index = Math.floor(Math.log(size) / Math.log(1000));

    return `${+(size / Math.pow(1000, index)).toPrecision(3)} ${abbreviations[index]}`;
}
