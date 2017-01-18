import * as GraphQL from 'graphql'
import * as assert from 'assert'

import { IGNORED_FIELD } from './parse'

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
): string {
  const rootFields: Field[] = fragments.map(query => {
    // Relay fragments don’t specify a name.
    const ast = GraphQL.parse(query);
    const typeInfo = new GraphQL.TypeInfo(schema)
    let fragment = null
    let fieldStack: Field[] = []

    // TODO use visitInParallel ?
    GraphQL.visit(ast, GraphQL.visitWithTypeInfo(typeInfo, {
      FragmentDefinition: (node) => {
        assert(fragment === null, 'Expected a single fragment definition');
        const rootField: Field = { name: 'RelayProps', fields: [], type: null }
        fieldStack.push(rootField)
        fragment = { name: node.name.value, fields: rootField.fields, definition: {} }
      },
      NamedType: {
        leave: (node) => {
          assert(fragment, 'Expected to be inside a fragment definition');
          fragment.type = new GraphQL.GraphQLNonNull(typeInfo.getType())
        },
      },
      Field: {
        enter: (node) => {
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
        leave: (node) => {
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

  return `interface RelayProps {\n${printFields(rootFields, 1)}\n}`
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
  assert(false, 'printInterface')
}

function printUnion(type: GraphQL.GraphQLUnionType) {
  assert(false, 'printUnion')
}

function printEnum(type: GraphQL.GraphQLEnumType) {
  assert(false, 'printEnum')
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
  assert(false, 'Unknown type: ' + require('util').inspect(type))
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
