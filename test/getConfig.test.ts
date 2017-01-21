import 'mocha'
import * as assert from 'assert'
import { schema } from './helper'
import * as GraphQL from 'graphql'

import { getConfig } from '../src/getConfig'

// These get stubbed
const fs = require('fs')
import * as GraphQLConfigParser from 'graphql-config-parser'

GraphQL.graphql(schema, GraphQL.introspectionQuery).then(schemaJSON => {
  describe('getConfig', () => {
    const originalExistSync = fs.existSync

    beforeEach(() => {
      fs.existSync = () => false
      fs.readFileSync = () => {
        throw new Error('Unexpected')
      }
      GraphQLConfigParser.parse = () => {
        throw new Error('Unexpected')
      }
      GraphQLConfigParser.resolveSchema = () => {
        throw new Error('Unexpected')
      }
    })

    afterEach(() => {
      fs.existSync = originalExistSync
    })

    describe('concerning schema', () => {
      it('defaults to data/schema.json', () => {
        fs.existsSync = (path) => path === 'data/schema.json'
        GraphQLConfigParser.resolveSchema = ({ file }) => {
          return Promise.resolve(file === 'data/schema.json' ? schemaJSON : null)
        }
        return getConfig().then(config => {
          assert.deepEqual(config.interfaceName, null)
          return GraphQL.graphql(config.schema, GraphQL.introspectionQuery).then(actual => {
            assert.deepEqual(actual, schemaJSON)
          })
        })
      })

      it('uses the file specified in package.json', () => {
        fs.readFileSync = (path) => {
          if (path === 'another/root/package.json') {
            return JSON.stringify({ relay2ts: { interfaceName: 'OtherProps' } })
          } else {
            return null
          }
        }
        GraphQLConfigParser.parse = (root) => {
          return root === 'another/root' ? { file: 'path/from/package/schema.json' } : null
        }
        GraphQLConfigParser.resolveSchema = ({ file }) => {
          return Promise.resolve(file === 'path/from/package/schema.json' ? schemaJSON : null)
        }
        return getConfig({ rootPath: 'another/root' }).then(config => {
          assert.deepEqual(config.interfaceName, 'OtherProps')
          return GraphQL.graphql(config.schema, GraphQL.introspectionQuery).then(actual => {
            assert.deepEqual(actual, schemaJSON)
          })
        })
      })

      it('uses the explicitly specified path', () => {
        GraphQLConfigParser.resolveSchema = ({ file }) => {
          return Promise.resolve(file === 'another/path/schema.json' ? schemaJSON : null)
        }
        return getConfig({ schemaPath: 'another/path/schema.json' }).then(config => {
          assert.deepEqual(config.interfaceName, null)
          return GraphQL.graphql(config.schema, GraphQL.introspectionQuery).then(actual => {
            assert.deepEqual(actual, schemaJSON)
          })
        })
      })
    })
  })
})
