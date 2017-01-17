import * as assert from 'assert';
import * as stripIndent from 'strip-indent'
import { generateInterface } from '../src/extension'
import * as GraphQL from 'graphql'

// interface RelayProps {
//   artwork: {
//     title?: string,
//     artists: Array<{
//       name: string,
//     }>,
//   },
//   gallery: {
//     name: string
//   }
// }
// const props: RelayProps = {
//   artwork: { title: 'foo', artists: [{ name: 'foo' }] },
//   gallery: { name: 'bar' },
// }
// props.artwork.artists[0].name

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

    const actual = generateInterface(schema, {
      artwork: `
        fragment on Artwork {
          id
          title
          artists {
            name
          }
          gene_ids
        }
      `,
      gallery: `
        fragment on Partner {
          name
        }
      `
    })

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
          name: string
        }
      }
    `).trim()
    console.log(expected)

    assert.equal(actual, expected)
  })
})
