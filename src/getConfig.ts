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
      config = getConfig.parseGraphQLConfig(rootPath)
    } catch(_) {
      if (getConfig.existsSync('data/schema.json')) {
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
      const pkg = JSON.parse(getConfig.readFileSync(path.join(rootPath, 'package.json'), 'utf-8'))
      interfaceName = pkg.graphql.tsInterfaceName
    } catch (_) {}
  }

  return getConfig.resolveSchema(config).then(schemaJSON => {
    const schema = getConfig.buildGraphQLSchema(schemaJSON.data)
    return { schema, interfaceName }
  })
}

// Dependency injection interface
export namespace getConfig {
  // graphql
  export let buildGraphQLSchema: typeof GraphQL.buildClientSchema

  // fs
  export let readFileSync: typeof fs.readFileSync
  export let existsSync: typeof fs.existsSync

  // graphql-config-parser
  export let parseGraphQLConfig: typeof GraphQLConfigParser.parse
  export let resolveSchema: typeof GraphQLConfigParser.resolveSchema
}

getConfig.buildGraphQLSchema = GraphQL.buildClientSchema
getConfig.readFileSync = fs.readFileSync
getConfig.existsSync = fs.existsSync
getConfig.parseGraphQLConfig = GraphQLConfigParser.parse
getConfig.resolveSchema = GraphQLConfigParser.resolveSchema
