import * as fs from 'fs'
import * as path from 'path'
import * as GraphQL from 'graphql'
import * as GraphQLConfigParser from 'graphql-config-parser'

export interface Config {
  schema: GraphQL.GraphQLSchema,
  interfaceName: string | null,
}

export function getConfig(
  options: { rootPath?: string, schemaPath?: string } = {}
): Promise<Config> {
  const schemaPath = options.schemaPath
  const rootPath = options.rootPath || process.cwd()

  let config
  if (schemaPath) {
    config = { type: 'file', file: schemaPath }
  } else {
    try {
      config = GraphQLConfigParser.parse(rootPath)
    } catch(_) {
      if (fs.existsSync('data/schema.json')) {
        config = { type: 'file', file: 'data/schema.json' }
      }
    }
  }
  if (!config) {
    return Promise.reject(new Error('A schema must be provided either with the --schema option or any of the options described here https://github.com/graphcool/graphql-config#usage'))
  }
  if (config.file) {
    config.file = path.resolve(rootPath, config.file)
  }

  let interfaceName = null
  if (rootPath) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8'))
      interfaceName = pkg.relay2ts.interfaceName
    } catch (_) {}
  }

  return GraphQLConfigParser.resolveSchema(config).then(schemaJSON => {
    const schema = GraphQL.buildClientSchema(schemaJSON.data)
    return { schema, interfaceName }
  })
}
