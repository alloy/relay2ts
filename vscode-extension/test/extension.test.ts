import * as assert from 'assert';
import * as stripIndent from 'strip-indent'
import { generateInterface } from '../src/extension'
import * as GraphQL from 'graphql'

suite('Extension Tests', () => {
  test('generates interfaces for each fragment', () => {
    GraphQL.GraphQLID
    const schema = GraphQL.buildSchema(`
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

    const actual = generateInterface(schema, [
      `
        fragment artwork on Artwork {
          id
          title
          artists {
            name
          }
          gene_ids
        }
      `,
      `
        fragment gallery on Partner {
          name
        }
      `
    ])

    const expected = stripIndent(`
      interface RelayProps {
        artwork: {
          id: string,
          title: string | null,
          artists: Array<{
            name: string,
          }>,
          gene_ids: Array<string>,
        },
        gallery: {
          name: string,
        },
      }
    `).trim()

    assert.equal(actual, expected)
  })
})
