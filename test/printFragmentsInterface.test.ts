import 'mocha'
import * as assert from 'assert'
import { schema, strip } from './helper'

import * as GraphQL from 'graphql'
import { IGNORED_FIELD } from '../src/parse'
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
      interface IRelayProps {
        artwork: {
          id: string,
          title: string | null,
          artists: Array<{
            name: string,
          } | null> | null,
          gene_ids: Array<string>,
        },
        gallery: {
          name: string,
        },
      }
    `)

    assert.deepEqual(actual, expected)
  })

  it('skips sentinal fields meant to be ignored', () => {
    const actual = printFragmentsInterface(schema, [
      `
        fragment artwork on Artwork {
          id
          ${IGNORED_FIELD}
          artists {
            ${IGNORED_FIELD}
          }
        }
      `,
    ])

    const expected = strip(`
      interface IRelayProps {
        artwork: {
          id: string,
          artists: Array<any | null> | null,
        },
      }
    `)

    assert.deepEqual(actual, expected)
  })

  it('prints a plural fragment', () => {
    const actual = printFragmentsInterface(schema, [
      `
        fragment artworks on Artwork @relay(plural: true) {
          id
        }
      `,
    ])

    const expected = strip(`
      interface IRelayProps {
        artworks: Array<{
          id: string,
        } | null> | null,
      }
    `)

    assert.deepEqual(actual, expected)
  })
})
