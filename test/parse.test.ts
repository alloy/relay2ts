import 'mocha'
import * as assert from 'assert'
import { strip } from './helper'

import * as GraphQL from 'graphql'
import { parse } from '../src/parse'

describe('parse', () => {
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
    `)

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
    `)

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
    `)

    assert.deepEqual(fragments.map(strip), [
      strip(`
        fragment partner on Partner {
          id
        }
      `),
    ])
  })

  it('returns an empty list if nothing can be extracted', () => {
    assert.deepEqual(parse(`const foo = 42`), [])
  })

  it('ignores nested fragments', () => {
    const fragments = parse(`
      Relay.createContainer(Artwork, {
        fragments: {
          artwork: () => Relay.QL\`
            fragment on Artwork {
              id
              \${Metadata.getFragment('artwork')}
            }
          \`,
        }
      })
    `)

    assert.deepEqual(fragments.map(strip), [
      strip(`
        fragment artwork on Artwork {
          id
        }
      `),
    ])
  })
})
