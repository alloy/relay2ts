import * as stripIndent from 'strip-indent'

export function strip(input: string): string {
  return stripIndent(input).replace(/^\s*$\n/gm, '').trim()
}
