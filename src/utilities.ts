import * as vscode from 'vscode';


/**
 * Get an array of all available commands.
 * @returns {Promise<String[]>}
 */
export async function getAllCommands(): Promise<string[]> {
  return await vscode.commands.getCommands();
}

/**
 * Trigger a QuickInput to get 'repeat' arg from the user.
 * @returns {Promise<String>}
 */
export async function getRepeatInput (): Promise<number> {

  // add index message here
  // consider ignoreFocusOut, built-in setting default is false (Quick Open: Close on Focus Lost)
  const options = {
    title: "Repeat",
    prompt: "Enter the number of times to repeat the sequence of commands.",
    placeHolder: "\tA number."
  };
  const repeatNum = await vscode.window.showInputBox(options);

  return Math.floor(Number(repeatNum)) || 0;
};