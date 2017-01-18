import 'mocha'
import * as assert from 'assert'
import { schema, strip } from './helper'

import * as GraphQL from 'graphql'
import { printFragmentsInterface } from '../src/printFragmentsInterface'

describe('printFragmentsInterface', () => {
  it('only includes the fields in the fragments', () => {
    const actual = printFragmentsInterface(schema, [
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

    const expected = strip(`
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
    `)

    assert.equal(actual, expected)
  })
})
