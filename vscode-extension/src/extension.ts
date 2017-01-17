import * as vscode from 'vscode'
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'
import * as GraphQL from 'graphql'
import * as assert from 'assert'

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.generateRelayFragmentInterface', () => {
    const doc = vscode.window.activeTextEditor.document
    const source = ts.createSourceFile(doc.fileName, doc.getText(), ts.ScriptTarget.ES2016, /*setParentNodes */ true);
    const dumped = findContainers(source)
    assert(dumped.length === 1, 'Can only handle 1 Relay container per file.')
    const propsInterface = dumped[0]

    // TODO Check for selection?
    // if (vscode.window.activeTextEditor.selection.isEmpty) {
    // }
    vscode.window.activeTextEditor.edit(editor => {
      editor.insert(vscode.window.activeTextEditor.selection.active, propsInterface)
    })
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function findContainers(node: ts.Node): string[] {
  let dumped = []
  if (node.kind === ts.SyntaxKind.CallExpression && node.getChildAt(0).getText() === 'Relay.createContainer') {
    dumped.push(dumpContainer(node as ts.CallExpression))
  }
  ts.forEachChild(node, child => {
    dumped = dumped.concat(findContainers(child))
  })
  return dumped
}

function dumpContainer(node: ts.CallExpression) {
  const containerOptions = node.arguments[1]
  let fragments = null
  ts.forEachChild(containerOptions, option => {
    if (option.getChildAt(0).getText() === 'fragments') {
      fragments = option.getChildAt(2)
    }
  })
  if (!fragments) {
    throw new Error('Container does not define any fragments')
  }
  const collected: string[] = []
  ts.forEachChild(fragments, fragment => {
    const name = fragment.getChildAt(0).getText()
    const template = <ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral>fragment.getChildAt(2).getChildAt(4).getChildAt(1)
    let query: string
    switch (template.kind) {
      case ts.SyntaxKind.TemplateExpression:
        // Afaik Relay fragment template strings aren’t allowed to interpolate anything other than fragments and since
        // Relay doesn’t give a component access to the props of another fragment we can just skip those completely.
        query = [template.head, ...template.templateSpans.map(span => span.literal)].map(part => {
          return part.getText().replace(/^}|\${$/g, '')
        }).join("")
        // Fallthrough
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        query = query || template.getText()
        query = query.substring(1, query.length - 1) // Strip backticks
        query = query.replace(/^\s*fragment on/, `fragment ${name} on`)
        collected.push(query)
    }
  })
  return generateInterface(
    GraphQL.buildSchema(fs.readFileSync('/Users/eloy/Code/Artsy/relational-theory/data/schema.graphql', 'utf-8')),
    collected,
  )
}

interface Field {
  name: string,
  type: GraphQL.GraphQLOutputType
  fields: Field[]
}

export function generateInterface(
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
          const field: Field = { name: node.name.value, fields: [], type: null }
          parentField.fields.push(field)
          fieldStack.push(field)
        },
        leave: (node) => {
          const field = fieldStack.pop()
          field.type = typeInfo.getFieldDef().type
        },
      },
    }), null)

    return fragment
  })

  return `interface RelayProps {\n${printFields(rootFields, 1)}\n}`
}

function printScalar(type: GraphQL.GraphQLScalarType) {
  switch (type.name) {
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
