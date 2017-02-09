import { readFileSync } from 'fs'
import { join } from 'path'
import { GraphQLSchema, buildSchema } from 'graphql'
import * as stripIndent from 'strip-indent'

import * as SourceMapSupport from 'source-map-support'
SourceMapSupport.install({ environment: 'node' })

export function strip(input: string): string {
  return stripIndent(input).replace(/^\s*$\n/gm, '').trim()
}

const schemaPath = join(__dirname, '../../test/schema.graphql')
export const schema = buildSchema(readFileSync(schemaPath, 'utf-8'))
