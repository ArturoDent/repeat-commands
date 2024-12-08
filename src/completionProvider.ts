import {
  languages, ExtensionContext, window, Range, Position,
  CompletionItem, CompletionItemKind, CompletionTriggerKind,
  SnippetString, MarkdownString
} from 'vscode';

import * as jsonc from 'jsonc-parser';
import { getRepeatInput } from './utilities';


export async function makeKeybindingsCompletionProvider (context: ExtensionContext) {
  const configCompletionProvider = languages.registerCompletionItemProvider (
    { pattern: '**/keybindings.json' },
    {
      provideCompletionItems(document, position, token, completionContext) {

        //const linePrefix = document.lineAt(position).text.substring(0, position.character);
        let inRepeatCommands = false;
    
        // ------------------------------------    args completion start   -------------------------------------------------
            
        const rootNode = jsonc.parseTree(document.getText());
        const curLocation = jsonc.getLocation(document.getText(), document.offsetAt(position));
        
        let thisConfig;
        let nodeValue;
        let command;
        let argsNode;

        if (rootNode) {
          thisConfig = _findConfig(rootNode, document.offsetAt(position));
          if (thisConfig) nodeValue = jsonc.getNodeValue(thisConfig);
          else return undefined;
          command = nodeValue.command;
        }
        else return undefined;

        if (command === "repeat-commands.runSequence") inRepeatCommands = true;
        else return undefined;
                 

        //if (curLocation.path[2] && !curLocation.isAtPropertyKey) {
        //  const argCompletions = _completeArgs(linePrefix, position, find, search, curLocation);
        //  if (argCompletions) return argCompletions;
        //  else return undefined;
        //}
        
        // ------------------------------------    duplicate args removal start   ------------------------------------

        // curLocation.path = [26, 'args', ''] = good  or [26, 'args', 'replace', 1] = bad here
        // curLocation.path = [26, 'args', 'postCommands', ''] = bad
        if ((curLocation?.path[2] !== '' && !curLocation?.path[2]) || curLocation?.path[1] !== 'args' || curLocation?.path[3] === '') return undefined;

        if (thisConfig) {
          argsNode = thisConfig.children?.filter(entry => {
            if (entry.children) return entry.children[0].value === "args";
          });
        }

        let argsStartingIndex;
        let argsLength;
        let argsRange;
        
        if (argsNode) {
          argsStartingIndex = argsNode[0].offset;
          argsLength = argsStartingIndex + argsNode[0].length;
        }

        if (argsStartingIndex && argsLength)
          argsRange = new Range(document.positionAt(argsStartingIndex), document.positionAt(argsLength));
        if (!argsRange?.contains(position)) return undefined;
        
        const argsText = document.getText(argsRange);
        const commandArgs = _getKeys().slice(1);       // remove title
        
        const textLine = document.lineAt(position);
        let   replaceRange = textLine.range;
        const startPos = new Position(textLine.lineNumber, textLine.firstNonWhitespaceCharacterIndex);
        let   invoked = (completionContext.triggerKind === CompletionTriggerKind.Invoke) ? true : false;
        
        if ((completionContext.triggerKind === CompletionTriggerKind.Invoke) && textLine.isEmptyOrWhitespace) {
          // invoke on an empty line
          replaceRange = replaceRange.with(startPos);
        }

        else if ((completionContext.triggerKind === CompletionTriggerKind.Invoke) && !textLine.isEmptyOrWhitespace) {
          // '"reveal": "first"  select reveal and invoke
          const lineRange = window.activeTextEditor?.document.lineAt(position.line).range;
          const wordRange = window.activeTextEditor?.document.getWordRangeAtPosition(position);
          if (wordRange && lineRange)
            replaceRange = new Range(wordRange?.start, lineRange?.end);
          else if (lineRange) {
            replaceRange = new Range(position, lineRange?.end);
            invoked = false;
          }
          // TODO: handle invoke when selecting entire key
        }
        else {
          replaceRange = new Range(position, position);
        }
          
        if (inRepeatCommands) {
          return _filterCompletionsItemsNotUsed(commandArgs, argsText, replaceRange, position, invoked);
        }
        return undefined;
      }
    },
  '"', '$', '{'   // trigger intellisense/completion
);

context.subscriptions.push(configCompletionProvider);
};


function _filterCompletionsItemsNotUsed(argArray: string[], argsText: string, replaceRange: Range, position: Position, invoked: Boolean) {

  const defaults: {[index: string]:any} = _getDefaults();  
  
	const priority: {[index: string]:any} = {
    "title": "01",
    "description": '02',    
    "preCommands": "03",
    "commands": "04",
    "repeat": "05",
    "postCommands": "06",
  };
  
	const documentation: {[index: string]:any} = {
		"title": "This will appear in the Command Palette as `Find-and-Transform:<title>`. Can include spaces.",
    "description": "Any string describing what this keybinding does.",
    
    "preCommands": "A single command, as a string, or an array of commands to run before the commands sequence.",
    "commands": "A sequence of commands to be repeated.",
    "repeat": "Number of times to run the commands, or '${getRepeatInput}'",
    "postCommands": "A single command, as a string, or an array of commands to run after the command sequence.",
	};

  return argArray
    .filter(option => argsText.search(new RegExp(`^[ \t]*"${option}"`, "gm")) === -1)
    .map(option => {
      return _makeKeyCompletionItem(option, replaceRange, defaults[`${option}`], priority[`${option}`], documentation[`${option}`], invoked);
    });
}



function _makeKeyCompletionItem(key: string, replaceRange: Range, defaultValue: string, sortText: string, documentation: string, invoked: Boolean) {

  let item;
  const leadingQuote = invoked ? '"' : '';  // if user-invoked, not character-triggered
  
  if (key === "repeat") {
    item = new CompletionItem("repeat: \"${getRepeatInput}\"", CompletionItemKind.Property);
    item.insertText = new SnippetString(`${leadingQuote}repeat": "\${getRepeatInput}",`);
    item.range = new Range(replaceRange.start, new Position(replaceRange.start.line, replaceRange.start.character + 1));
  }
  else if (key === "commands") {
    item = new CompletionItem("commands: []", CompletionItemKind.Property);
    item.insertText = new SnippetString(`${leadingQuote}commands": [\n\t\t"Command 1",\n\t\t"Command 2",\n\t\t"Command 3",\n],`);
    item.range = new Range(replaceRange.start, new Position(replaceRange.start.line, replaceRange.start.character + 1));
  }
  else {
    
    item = new CompletionItem(key, CompletionItemKind.Property);
  
    // don't select true/false/numbers defaultValue's
    if (typeof defaultValue === "number")  // key == delay
      item.insertText = new SnippetString(`${leadingQuote}${key}": \$\{1:${defaultValue}\},`);
    else if (typeof defaultValue === "boolean")
      item.insertText = new SnippetString(`${leadingQuote}${key}": ${defaultValue},`);
    else
      item.insertText = new SnippetString(`${leadingQuote}${key}": "\$\{1:${defaultValue}\}",`);
      
  
    if (!invoked)
      item.range = new Range(replaceRange.start, new Position(replaceRange.start.line, replaceRange.start.character + 1));
    else
      item.range = replaceRange;
  }
  
  if (defaultValue || typeof defaultValue === 'boolean') item.detail = `default: ${ defaultValue }`;
  if (sortText) item.sortText = sortText;
  
  const repeatText = `"repeat": "\${getRepeatInput}"
"repeat": 5`;
  
  const preCommandText = `"preCommands": "cursorHome"
"preCommands": ["cursorHome", "cursorEndSelect"]`;
  
  const postCommandText = `"postCommands": "editor.action.selectFromAnchorToCursor"
"postCommands": ["cursorHome", "editor.action.clipboardCopyAction"]`;
  
  const commandsText = `"commands": "editor.action.selectFromAnchorToCursor"
"commands": ["cursorHome", "editor.action.clipboardCopyAction"]`;
  

  if (documentation) {
    if (key === 'repeat')
      item.documentation = new MarkdownString(documentation).appendCodeblock(repeatText, 'jsonc');
    else if (key === 'preCommands')
      item.documentation = new MarkdownString(documentation).appendCodeblock(preCommandText, 'jsonc');
    else if (key === 'postCommands')
      item.documentation = new MarkdownString(documentation).appendCodeblock(postCommandText, 'jsonc');
    else if (key === 'commands')
      item.documentation = new MarkdownString(documentation).appendCodeblock(commandsText, 'jsonc');
      
    else item.documentation = new MarkdownString(documentation);
  }
  
	return item;
}


/**
 * Get the keybinding where the cursor is located.
 * 
 * @param {jsonc.Node} rootNode - all parsed confogs in keybindings.json
 * @param {number} offset - of cursor position
 * @returns {jsonc.Node} - the node where the cursor is located
 */
function _findConfig(rootNode: jsonc.Node, offset: number)  {

  if (!rootNode || !rootNode.children) return undefined;
  
  for (const node of rootNode.children) {
    if (node.offset <= offset && (node.offset + node.length > offset))
      return node;
  }
  return undefined;
}

/**
 * Get just the 
 */
function _getKeys () {
  return ["title", "description", "preCommands", "commands", "repeat", "postCommands"];
};

/**
 * Get the default values for all findInCurrentFile keys
 */
function _getDefaults () {
  return {
    "title": "",
    "description": "",
    "preCommands": "",
    "commands": "[]",
    "repeat": "${getRepeatInput}",
    "postCommands": ""
  };
};
