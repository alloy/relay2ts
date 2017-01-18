import * as ts from 'typescript'
import * as assert from 'assert'

export const IGNORED_FIELD = '__ignored_field'

export function parse(input: string): string[] {
  const sourceFile = ts.createSourceFile('TODO', input, ts.ScriptTarget.ES2016, true);
  const containers = extractContainers(sourceFile)
  assert(containers.length <= 1, 'Can only handle 1 Relay container per file.')
  return containers[0] || []
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
  const name = fragment.getChildAt(0).getText()
  const template = <ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral>fragment.getChildAt(2).getChildAt(4).getChildAt(1)
  let query: string
  switch (template.kind) {
    case ts.SyntaxKind.TemplateExpression:
      // Afaik Relay fragment template strings aren’t allowed to interpolate anything other than fragments and since
      // Relay doesn’t give a component access to the props of another fragment we can just skip those completely.
      query = [template.head, ...template.templateSpans.map(span => span.literal)].map(part => {
        // Remove interpolation braces: ${ … }
        const text = part.getText()
        const result = text.replace(/^}|\${$/g, '')
        return text.endsWith('${') ? result + IGNORED_FIELD : result
      }).join("")
      // Fallthrough
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      query = query || template.getText()
      // Strip backticks
      query = query.substring(1, query.length - 1)
      // Relay fragments don’t specify a name, so name it after the key in the fragments list.
      query = query.replace(/fragment on/, `fragment ${name} on`)
      return query
  }
  assert(false, 'Unable to parse fragment')
}
