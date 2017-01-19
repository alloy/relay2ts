import * as GraphQL from 'graphql'

import { IGNORED_FIELD } from './parse'

export const INTERFACE_NAME = 'IRelayProps'

interface Field {
  name: string,
  type: GraphQL.GraphQLOutputType
  fields: Field[] | null
}

const AnyType = new GraphQL.GraphQLScalarType({
  name: '__ANY',
  serialize: () => 'any',
})

export function printFragmentsInterface(
  schema: GraphQL.GraphQLSchema,
  fragments: string[],
  interfaceName?: string,
): string {
  interfaceName = interfaceName || INTERFACE_NAME

  const rootFields: Field[] = fragments.map(query => {
    const ast = GraphQL.parse(query);
    const typeInfo = new GraphQL.TypeInfo(schema)
    let fragment = null
    let fieldStack: Field[] = []

    // TODO use visitInParallel ?
    GraphQL.visit(ast, GraphQL.visitWithTypeInfo(typeInfo, {
      FragmentDefinition: {
        enter: (node: GraphQL.FragmentDefinitionNode) => {
          if (fragment) {
            throw new Error('Expected a single fragment definition.')
          }
          const rootField: Field = { name: interfaceName, fields: [], type: null }
          fieldStack.push(rootField)
          fragment = { name: node.name.value, fields: rootField.fields, definition: {} }
        },
        leave: (node: GraphQL.FragmentDefinitionNode) => {
          const plural = node.directives.some(directive => {
            return directive.name.value === 'relay' && directive.arguments.some(arg => {
              return arg.name.value === 'plural' && (arg.value as GraphQL.BooleanValueNode).value
            })
          })
          if (plural) {
            fragment.type = new GraphQL.GraphQLList(fragment.type)
          } else {
            fragment.type = new GraphQL.GraphQLNonNull(fragment.type)
          }
        },
      },
      NamedType: {
        leave: (node: GraphQL.NamedTypeNode) => {
          if (fragment === null) {
            throw new Error('Expected to be inside a fragment definition')
          }
          fragment.type = typeInfo.getType()
        },
      },
      Field: {
        enter: (node: GraphQL.FieldNode) => {
          const parentField = fieldStack[fieldStack.length - 1]
          // When entering a nested field, give the parent an empty array of fields.
          if (parentField.fields === null) {
            parentField.fields = []
          }
          // If the nested field is one that should be ignore, return now. If all nested fields are ignored, this leaves
          // the parent with an empty fields array.
          if (node.name.value === IGNORED_FIELD) {
            return null
          }
          const field: Field = { name: node.name.value, fields: null, type: null }
          parentField.fields.push(field)
          fieldStack.push(field)
        },
        leave: (node: GraphQL.FieldNode) => {
          const field = fieldStack.pop()
          if (field.fields && field.fields.length === 0) {
            // All nested fields were ignored, so cast it as `any`
            field.type = new GraphQL.GraphQLList(AnyType)
          } else {
            field.type = typeInfo.getFieldDef().type
          }
        },
      },
    }), null)

    return fragment
  })

  return `interface ${interfaceName} {\n${printFields(rootFields, 1)}\n}`
}

function printScalar(type: GraphQL.GraphQLScalarType) {
  switch (type.name) {
    case '__ANY':
      return 'any' // Internal scalar type
    case 'ID':
    case 'String':
      return 'string'
    case 'Boolean':
      return 'boolean'
    case 'Float':
    case 'Int':
      return 'number'
    default:
      return 'boolean | number | string'
  }
}

function printObject(field: Field, indentLevel: number) {
  const indent = ' '.repeat(indentLevel * 2)
  return `{\n${printFields(field.fields, indentLevel + 1)}\n${indent}}`
}

function printInterface(type: GraphQL.GraphQLInterfaceType) {
  throw new Error('TODO: printInterface')
}

function printUnion(type: GraphQL.GraphQLUnionType) {
  throw new Error('TODO: printUnion')
}

function printEnum(type: GraphQL.GraphQLEnumType) {
  throw new Error('TODO: printEnum')
}

function printList(field: Field, indentLevel: number) {
  const type = <GraphQL.GraphQLList<any>>field.type
  return `Array<${printNonNullableType(field, indentLevel, type.ofType)}>`
}

function printNonNullableType(field: Field, indentLevel: number, type?: GraphQL.GraphQLOutputType | null) {
  type = type || field.type
  if (type instanceof GraphQL.GraphQLNonNull) {
    type = type.ofType
  }

  if (type instanceof GraphQL.GraphQLScalarType) {
    return printScalar(type)
  } else if (type instanceof GraphQL.GraphQLObjectType) {
    return printObject(field, indentLevel)
  } else if (type instanceof GraphQL.GraphQLInterfaceType) {
    return printInterface(type)
  } else if (type instanceof GraphQL.GraphQLUnionType) {
    return printUnion(type)
  } else if (type instanceof GraphQL.GraphQLEnumType) {
    return printEnum(type)
  } else if (type instanceof GraphQL.GraphQLList) {
    return printList(field, indentLevel)
  }

  throw new Error(`Unknown type: ${require('util').inspect(type)}`)
}

function printType(field: Field, indentLevel: number) {
  const type = field.type
  if (type instanceof GraphQL.GraphQLNonNull) {
    return printNonNullableType(field, indentLevel, type.ofType)
  } else if (type instanceof GraphQL.GraphQLList) {
    return printNonNullableType(field, indentLevel)
  } else {
    return `${printNonNullableType(field, indentLevel)} | null`
  }
}

function printFields(fields: Field[], indentLevel: number) {
  return fields.map(field => printField(field, indentLevel)).join("\n")
}

function printField(field: Field, indentLevel: number) {
  const indent = ' '.repeat(indentLevel * 2)
  return `${indent}${field.name}: ${printType(field, indentLevel)},`
}
