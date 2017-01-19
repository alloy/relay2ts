import * as GraphQL from 'graphql'

import { ExistingInterfaceRange, parse } from './parse'
import { printFragmentsInterface } from './printFragmentsInterface'

export interface GenerationResult {
  input: string,
  propsInterface: string,
  existingInterfaceRange: ExistingInterfaceRange | null,
}

export function generateRelayFragmentsInterface(schema: GraphQL.GraphQLSchema, source: string): GenerationResult | null {
  const result = parse(source)
  if (result.fragments.length > 0) {
    return {
      input: result.input,
      propsInterface: printFragmentsInterface(schema, result.fragments),
      existingInterfaceRange: result.existingInterfaceRange,
    }
  } else {
    return null
  }
}
