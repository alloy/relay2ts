import * as GraphQL from 'graphql'

import { ExistingInterfaceRange, parse } from './parse'
import { printFragmentsInterface } from './printFragmentsInterface'

export { getConfig } from './getConfig'

export interface GenerationResult {
  input: string,
  propsInterface: string,
  existingInterfaceRange: ExistingInterfaceRange | null,
}

export function generateRelayFragmentsInterface(
  schema: GraphQL.GraphQLSchema,
  source: string,
  interfaceName?: string,
): GenerationResult | null {
  const result = parse(source, interfaceName)
  if (result.fragments.length > 0) {
    return {
      input: result.input,
      propsInterface: printFragmentsInterface(schema, result.fragments, interfaceName),
      existingInterfaceRange: result.existingInterfaceRange,
    }
  } else {
    return null
  }
}
