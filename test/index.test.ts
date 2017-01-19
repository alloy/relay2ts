import 'mocha'
import * as assert from 'assert'
import { schema, strip } from './helper'

import { generateRelayFragmentsInterface } from '../src/index'
import { parse } from '../src/parse'
import { printFragmentsInterface } from '../src/printFragmentsInterface'

describe('generateRelayFragmentsInterface', () => {
  it('creates an interface from a source file', () => {
    const actual = generateRelayFragmentsInterface(schema, `
      Relay.createContainer(Artwork, {
        fragments: {
          artwork: () => Relay.QL\`
            fragment on Artwork {
              id
              \${Metadata.getFragment('artwork')}
            }
          \`,
        }
      }
    `).propsInterface
    const expected = printFragmentsInterface(schema, ['fragment artwork on Artwork { id }'])
    assert.deepEqual(actual, expected)
  })

  it('returns nothing when there’s no fragments', () => {
    assert.equal(generateRelayFragmentsInterface(schema, 'const foo = 42'), null)
  })
})
