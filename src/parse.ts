import * as ts from 'typescript'

import { INTERFACE_NAME } from './printFragmentsInterface'

export const IGNORED_FIELD = '__ignored_field'

export interface ParseResult {
  input: string,
  fragments: string[],
  existingInterfaceRange: ExistingInterfaceRange | null,
}

export interface ExistingInterfaceRange {
  start: number,
  end: number,
}

export function parse(
  input: string,
  interfaceName?: string,
): ParseResult {
  interfaceName = interfaceName || INTERFACE_NAME
  const sourceFile = ts.createSourceFile('TODO', input, ts.ScriptTarget.ES2016, true);
  const containers = extractContainers(sourceFile)
  if (containers.length > 1) {
    throw new Error('Can only process 1 Relay container per file.')
  }
  return {
    input,
    fragments: containers[0] || [],
    existingInterfaceRange: extractExistingInterfaceRange(sourceFile, interfaceName),
  }
}

function extractExistingInterfaceRange(node: ts.Node, interfaceName: string): ExistingInterfaceRange {
  let range: ExistingInterfaceRange = null
  ts.forEachChild(node, child => {
    if (child.kind === ts.SyntaxKind.InterfaceDeclaration && child.getChildAt(1).getText() === interfaceName) {
      range = { start: child.getStart(), end: child.getEnd() }
    }
  })
  return range
}

function extractContainers(node: ts.Node): string[][] {
  let dumped = []
  if (node.kind === ts.SyntaxKind.CallExpression && node.getChildAt(0).getText() === 'Relay.createContainer') {
    dumped.push(parseContainer(node as ts.CallExpression))
  }
  ts.forEachChild(node, child => {
    dumped = dumped.concat(extractContainers(child))
  })
  return dumped
}

function parseContainer(node: ts.CallExpression): string[] {
  const containerOptions = node.arguments[1]
  let fragments = null
  ts.forEachChild(containerOptions, option => {
    if (option.getChildAt(0).getText() === 'fragments') {
      fragments = option.getChildAt(2)
    }
  })
  if (!fragments) {
    return []
  }

  const collected: string[] = []
  ts.forEachChild(fragments, fragment => {
    collected.push(parseFragment(fragment))
  })
  return collected
}

function parseFragment(fragment: ts.Node): string {
  const fragmentName = fragment.getChildAt(0).getText()
  const wrapperFunction = fragment.getChildAt(2)
  const relayQL = wrapperFunction.getChildAt(4)
  const queryTemplate = <ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral>relayQL.getChildAt(1)

  let query: string
  switch (queryTemplate.kind) {
    case ts.SyntaxKind.TemplateExpression:
      // Afaik Relay fragment template strings aren’t allowed to interpolate anything other than fragments and since
      // Relay doesn’t give a component access to the props of another fragment we can just skip those completely.
      query = [queryTemplate.head, ...queryTemplate.templateSpans.map(span => span.literal)].map(part => {
        const text = part.getText()
        // Remove interpolation braces: ${ … }
        const result = text.replace(/^}|\${$/g, '')
        return text.endsWith('${') ? result + IGNORED_FIELD : result
      }).join("")
      // Fallthrough
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      query = query || queryTemplate.getText()
      // Strip backticks
      query = query.substring(1, query.length - 1)
      // Relay fragments don’t specify a name, so name it after the key in the fragments list.
      query = query.replace(/fragment on/, `fragment ${fragmentName} on`)
      return query
  }

  throw new Error(`Unable to parse fragment:\n${fragment.getText()}`)
}
