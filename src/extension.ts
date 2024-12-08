import * as vscode from 'vscode';
import * as utilities from './utilities';

import * as runCommands from './run';
import * as providers from './completionProvider';



export function activate(context: vscode.ExtensionContext) {
  
  providers.makeKeybindingsCompletionProvider(context);
  

  let disposable = vscode.commands.registerCommand('repeat-commands.runSequence', async (args) => {
    
    args: {preCommands: string|[]|object, commands: string|[]|object, repeat: Number, postCommands: string|[]|object}
    
    if (args.repeat === '${getRepeatInput}') args.repeat = await utilities.getRepeatInput();
      
    runCommands.runIt(args);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
