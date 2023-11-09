import * as vscode from 'vscode';
import * as path from 'path';
import * as utilities from './utilities';

       

export interface ArgsObject {
  preCommands: string | string[],
  commands: string | string[],
  postCommands: string | string[],  
  repeat: number
};

enum CommandSequence {
  PreCommands,
  Commands,
  PostCommands
}

type CommandObject = {
  command: string,
  args: {}
};


// preCommands and postCommands !  Each runs once?

export async function buildCommands(args: ArgsObject): Promise<string> {
  
  let preCommands = args.preCommands;
  let commands = args.commands;
  let postCommands = args.postCommands;
  
  const repeat = Math.abs(Math.floor(args.repeat));
  let sequence;
  
  const allCommands = await utilities.getAllCommands();
  
  let argCommands = [preCommands, commands, postCommands];
  let sequences = [];   // will be => [ preCommandSequence, sequence, postCommandSequence ]
  
  let index = 0;
  
  for await (let set of argCommands) {
    
    if (set && !Array.isArray(set)) set = [set];  // set could be string/string[]/object[]
    
    if (Array.isArray(set)) sequences[index] = await _flatMapCommands(set, allCommands);
    
    if (sequences && sequences[index]) sequences[index] = sequences[index].join('');  
    
    index++;
  }
  
  if (repeat)
    sequences[CommandSequence.Commands] = sequences[CommandSequence.Commands].repeat(repeat);
  
  // sequence = preCommandSequence + sequence + postCommandSequence;
  sequence = sequences.join('');
  
  return sequence || "";
}


async function _flatMapCommands(commands: string[], allCommands: string[]): Promise<any> {

  // {
  //   command: "workbench.action.terminal.sendSequence",
  //   args: {
  //     text: "cd '${fileDirname}'\r",
  //   },
  // }
  
  // need to resolve path variables first, else fails = can't find ${fileDirname} for example
  
  return commands.flatMap((command: string | CommandObject) => {
    
    // if (typeof command !== 'string') {
      
      // if (command.args) {
        
      //   // return `await vscode.commands.executeCommand('${command.command}', \{ ${command.args} \});\n`;
      //   return `await vscode.commands.executeCommand('workbench.action.terminal.sendSequence', {text:'howdy'});\n`;
      //   // return `await vscode.commands.executeCommand('${command.command}', {text:'echo ${fileDirname}\u000d'});\n`;
      // }
    // }
    
    if (typeof command === 'string') {
      
      if (allCommands.includes(command))
        return `await vscode.commands.executeCommand('${command}');\n`;
      
      else if (command.startsWith('vscode.'))
        return `await ${command};\n`;
    }
  });
}



// export async function runIt(args: ArgsObject): Promise<string> {
export async function runIt(args: ArgsObject) {
  
  let sequence = await buildCommands(args);
  if (!sequence) return;
  
  let resolved = '';

  // let resolved = "";
  let document = vscode.window.activeTextEditor?.document;
  let jsOPError = "";
  // -------------------  jsOp ------------------------------------------------------------------
    
  // can have multiple $${...}$$ in a replace
  const re = new RegExp("(?<jsOp>\\$\\$\\{([\\S\\s]*?)\\}\\$\\$)", "gm");
  
  try {
      
    // resolved = resolved?.replaceAll(re, function (match, p1, operation) {
        
      // if (/\bawait\b/.test(operation)) {
        
      if (/vscode\./.test(sequence) && /path\./.test(sequence))
        return Function('vscode', 'path', 'require', 'document', `"use strict"; (async function run (){${sequence}})()`)
          (vscode, path, require, document);
      else if (/vscode\./.test(sequence))
        Function('vscode', 'require', 'document', `"use strict"; (async function run (){${sequence}})()`)
          (vscode, require, document);
      else if (/path\./.test(sequence))
        return Function('path', 'require', 'document', `"use strict"; (async function run (){${sequence}})()`)
          (path, require, document);
      else
        Function('require', 'document', `"use strict"; return (async function run (){${sequence}})()`)
          (require, document);
    // });
        
    //   else {  // no await in the jsOp
          
    //     if (/vscode\./.test(operation) && /path\./.test(operation))
    //       return Function('vscode', 'path', 'require', 'document', `"use strict"; ${operation}`)
    //         (vscode, path, require, document);
    //     else if (/vscode\./.test(operation))
    //       return Function('vscode', 'require', 'document', `"use strict"; ${operation}`)
    //         (vscode, require, document);
    //     else if (/path\./.test(operation))
    //       return Function('path', 'require', 'document', `"use strict"; ${operation}`)
    //         (path, require, document);
    //     else {
    //       return Function('require', 'document', `"use strict"; ${operation}`)
    //         (require, document);
    //     }
    //   }
    // });
      
  }
  
  catch (jsOPError: any) {  // this doesn't run async
    let resolved = 'Error: jsOPError';
      
    vscode.window.showWarningMessage("There was an error in the `$${<operations>}$$` part of the replace value.  See the Output channel: `find-and-transform` for more.");
      
    throw new Error(jsOPError.stack);
  }
  // -------------------  jsOp ------------------------------------------------------------------
  
  return resolved;
};