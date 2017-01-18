import * as GraphQL from 'graphql'
import * as stripIndent from 'strip-indent'

export function strip(input: string): string {
  return stripIndent(input).replace(/^\s*$\n/gm, '').trim()
}

export const schema = GraphQL.buildSchema(`
  type Query {
    artwork: Artwork
    partner: Partner
  }
  type Artwork {
    id: ID!
    title: String
    gene_ids: [String]
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
