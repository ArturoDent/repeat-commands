# Repeat Commands  

Run a command or a set of commands any number of times.  The commands to be run are listed in a keybinding.  The number of times to run the commands can be included in that keybinding or obtained by opening an `Input Box for the user to enter some number`.  

You can optionally run a command(s) before and after the repeated squence has run.  

## Sample Keybinding

```jsonc
  {
    "key": "alt+r",                           // whatever keybinding you want
    "command": "repeat-commands.runSequence",
    
    "args": {
      
      "preCommands": "editor.action.clipboardCopyAction",
      
      "commands": [                            // these will be repeated
        "editor.action.insertLineAfter",
        "editor.action.clipboardPasteAction",
        
        // can run vscode extension api commands too
        "workbench.action.files.newUntitledFile",
        "vscode.languages.setTextDocumentLanguage(document, 'css')"  // using single quotes inside double-quotes
      ],
      
      // "repeat": 5,   // hard-coded amount to repeat the 'commands``
      "repeat": "${getRepeatInput}",  // to prompt the user for a 'repeat' number
      
      // "postCommands": "editor.action.insertLineAfter"  // applies to last file/line created
    }
  },
```

If you have no `repeat` argument, then `0` will be used - so the `commands` will be run once.  

If you want to use vscode's extension api commands, then they should look like

```plaintext
"vscode.languages.setTextDocumentLanguage(document, 'css')"  
```

`await` will be added to all commands so you do not need to add that.

The command must start with `vscode.` as all api's do.

## Extension Commands

* `repeat-commands.runSequence`

## Known Issues

## Release Notes

* 0.0.2 

-----------------------------------------------------------------------------------------------------------
