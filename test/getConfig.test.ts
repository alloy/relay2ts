import 'mocha'
import * as assert from 'assert'
import { schema } from './helper'

import * as path from 'path'
import * as GraphQL from 'graphql'

import * as proxyquire from 'proxyquire'
const moduleStubs = {
  'fs': {} as any,
  'graphql-config-parser': {} as any,
}
const fs = moduleStubs['fs']
const GraphQLConfigParser = moduleStubs['graphql-config-parser']

const { getConfig } = proxyquire('../src/getConfig', moduleStubs)

GraphQL.graphql(schema, GraphQL.introspectionQuery).then(schemaJSON => {
  describe('getConfig', () => {
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
      delete fs.readFileSync
    })

    describe('concerning schema', () => {
      it('defaults to data/schema.json', () => {
        fs.existsSync = (path) => {
          assert.equal(path, 'data/schema.json')
          return true
        }
        GraphQLConfigParser.resolveSchema = ({ file }) => {
          assert.equal(file, path.resolve('data/schema.json'))
          return Promise.resolve(schemaJSON)
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
          assert.equal(path, 'another/root/package.json')
          return JSON.stringify({ relay2ts: { interfaceName: 'OtherProps' } })
        }
        GraphQLConfigParser.parse = (root) => {
          assert.equal(root, 'another/root')
          return { file: 'path/from/package/schema.json' }
        }
        GraphQLConfigParser.resolveSchema = ({ file }) => {
          assert.equal(file, path.resolve('another/root', 'path/from/package/schema.json'))
          return Promise.resolve(schemaJSON)
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
          assert.equal(file, path.resolve('another/path/schema.json'))
          return Promise.resolve(schemaJSON)
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
