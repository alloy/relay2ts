import * as GraphQL from 'graphql'

import { parse } from './parse'
import { printFragmentsInterface } from './printFragmentsInterface'

export function generateRelayFragmentsInterface(schema: GraphQL.GraphQLSchema, source: string): string | null {
  const fragments = parse(source)
  if (fragments.length > 0) {
    return printFragmentsInterface(schema, fragments)
  } else {
    return null
  }
}
