import * as vscode from 'vscode'
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'

function findContainers(node: ts.Node) {
  if (node.kind === ts.SyntaxKind.CallExpression && node.getChildAt(0).getText() === 'Relay.createContainer') {
    console.log(node.getText())
    dumpContainer(node as ts.CallExpression)
  }
  ts.forEachChild(node, findContainers);
}

function dumpContainer(node: ts.CallExpression) {
  console.log(node)
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
  const collected = {}
  ts.forEachChild(fragments, fragment => {
    collected[fragment.getChildAt(0).getText()] = fragment.getChildAt(2).getChildAt(4).getChildAt(1).getText()
  })
  console.log(collected)
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.generateRelayFragmentInterface', () => {
    const doc = vscode.window.activeTextEditor.document
    const source = ts.createSourceFile(doc.fileName, doc.getText(), ts.ScriptTarget.ES2016, /*setParentNodes */ true);
    findContainers(source)
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
