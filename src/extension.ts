'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let request = require('request');
    let fs = require('fs');
    let output : vscode.OutputChannel = vscode.window.createOutputChannel("Jenkins Pipeline Linter");

    let lastInput: string;

    let validate = vscode.commands.registerCommand('jenkins.pipeline.linter.connector.validate', async () => {

        let url = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.url') as string | undefined;
        let user = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.user') as string | undefined;
        let pass = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.pass') as string | undefined;
        let crumbUrl = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.crumbUrl') as string | undefined;
        let strictssl = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.strictssl') as boolean;

        if (url === undefined || url.length === 0) {
            url = await vscode.window.showInputBox({ prompt: 'Enter Jenkins Pipeline Linter Url.', value: lastInput });
        }
        if (url !== undefined && url.length > 0) {
            lastInput = url;

            if(crumbUrl !== undefined && crumbUrl.length > 0) {
                requestCrumb(fs, request, url, crumbUrl, user, pass, strictssl, output);
            } else {
                validateRequest(fs, request, url, user, pass, undefined, strictssl, output);
            }
        } else {
            output.appendLine('Jenkins Pipeline Linter Url is not defined.');
        }
        output.show(true);
    });
    context.subscriptions.push(validate);
}

function requestCrumb(fs: any, request: any, url: string, crumbUrl: string, user: string|undefined, pass: string|undefined, strictssl: boolean, output: vscode.OutputChannel) {
    let options: any = {
        method: 'GET',
        url: crumbUrl,
        strictSSL: strictssl
    };
    if(user !== undefined && user.length > 0 && pass !== undefined && pass.length > 0) {
        options.auth = {
            'user': user,
            'pass': pass
        };
    }
    request(options, (err: any, httpResponse: any, body: any) => {
        if (err) {
            output.appendLine(err);
        } else {
            validateRequest(fs, request, url, user, pass, body, strictssl, output);
        }
    });
}

function validateRequest(fs: any, request: any, url: string, user: string|undefined, pass: string|undefined, crumb: string|undefined, strictssl: boolean, output: vscode.OutputChannel) {
    let activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor !== undefined) {
        let path = activeTextEditor.document.uri.fsPath;
        let filestream = fs.createReadStream(path);
        const chunks: any = [];
        filestream.on('data', (chunk: any) => {
            chunks.push(chunk.toString());
        });
        filestream.on('end', () => {
            let options: any = {
                method: 'POST',
                url: url,
                strictSSL: strictssl,
                formData: {
                    'jenkinsfile': chunks.join()
                }
            };
            if(user !== undefined && user.length > 0 && pass !== undefined && pass.length > 0) {
                options.auth = {
                    'user': user,
                    'pass': pass
                };
            }
            if(crumb !== undefined && crumb.length > 0) {
                let crumbSplit = crumb.split(':');
                options.headers = {
                    'Jenkins-Crumb': crumbSplit[1]
                };
            }
            request(options, (err: any, httpResponse: any, body: any) => {
                if (err) {
                    output.appendLine(err);
                } else {
                    output.appendLine(body);
                }
            });
        });
    } else {
        output.appendLine('No active text editor. Open the jenkinsfile you want to validate.');
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}