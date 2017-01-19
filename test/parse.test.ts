import 'mocha'
import * as assert from 'assert'
import { strip } from './helper'

import * as GraphQL from 'graphql'
import { IGNORED_FIELD, parse } from '../src/parse'

describe('parse', () => {
  describe('concerning existing RelayProps', () => {
    it('returns null if no previous interface is found', () => {
      assert.deepEqual(parse('const foo = 42').existingInterfaceRange, null)
    })

    it('returns the range of an existing interface', () => {
      const result = parse(strip(`
        export default Relay.createContainer(Artwork, {
          fragments: {
            gallery: () => Relay.QL\`
              fragment on Partner {
                id
              }
            \`,
          }
        })
        interface RelayProps {
          gallery: {
            id: string,
          }
        }
      `))

      const range = result.existingInterfaceRange
      assert.deepEqual(result.input.substring(range.start, range.end), strip(`
        interface RelayProps {
          gallery: {
            id: string,
          }
        }
      `))
    })
  })

  describe('concerning fragments', () => {
    it('extracts fragments from a Relay container definition and names them', () => {
      const fragments = parse(`
        export default Relay.createContainer(Artwork, {
          fragments: {
            artwork: () => Relay.QL\`
              fragment on Artwork {
                id
              }
            \`,
            partner: () => Relay.QL\`
              fragment on Partner {
                id
              }
            \`,
          }
        })
      `).fragments

      assert.deepEqual(fragments.map(strip), [
        strip(`
          fragment artwork on Artwork {
            id
          }
        `),
        strip(`
          fragment partner on Partner {
            id
          }
        `),
      ])
    })

    it('calls the fragment after the key in the container’s fragments', () => {
      const fragments = parse(`
        export default Relay.createContainer(Artwork, {
          fragments: {
            gallery: () => Relay.QL\`
              fragment on Partner {
                id
              }
            \`,
          }
        })
      `).fragments

      assert.deepEqual(fragments.map(strip), [
        strip(`
          fragment gallery on Partner {
            id
          }
        `),
      ])
    })

    it('extracts a fragment from unfinished source', () => {
      const fragments = parse(`
        export default Relay.createContainer(Artwork, {
          fragments: {
            partner: () => Relay.QL\`
              fragment on Partner {
                id
              }
      `).fragments

      assert.deepEqual(fragments.map(strip), [
        strip(`
          fragment partner on Partner {
            id
          }
        `),
      ])
    })

    it('returns an empty list if nothing can be extracted', () => {
      assert.deepEqual(parse(`Relay.createContainer(Artwork,`).fragments, [])
    })

    it('replaces nested fragments with a sentinal field', () => {
      const fragments = parse(`
        Relay.createContainer(Artwork, {
          fragments: {
            artwork: () => Relay.QL\`
              fragment on Artwork {
                id
                \${Metadata.getFragment('artwork')}
                artists {
                  \${Metadata.getFragment('artists')}
                }
              }
            \`,
          }
        })
      `).fragments

      assert.deepEqual(fragments.map(strip), [
        strip(`
          fragment artwork on Artwork {
            id
            ${IGNORED_FIELD}
            artists {
              ${IGNORED_FIELD}
            }
          }
        `),
      ])
    })
  })
})
