import { GraphQLSchema, buildSchema } from 'graphql'
import * as stripIndent from 'strip-indent'

import * as SourceMapSupport from 'source-map-support'
SourceMapSupport.install({ environment: 'node' })

export function strip(input: string): string {
  return stripIndent(input).replace(/^\s*$\n/gm, '').trim()
}

export const schema = buildSchema(`
  type Query {
    artwork: Artwork
    partner: Partner
  }
  type Artwork {
    id: ID!
    title: String
    gene_ids: [String!]!
    artists(shallow: Boolean): [Artist]
  }
  type Artist {
    id: ID!
    name: String!
  }
  type Partner {
    id: ID!
    name: String!
  }
`)
