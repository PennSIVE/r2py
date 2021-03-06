const fs = require('fs-extra');
const convert = require('./src/r2py.js');
const path = require('path');
const os = require('os');
const execSync = require('child_process').execSync;
const replace = require('replace-in-file');
const core = require('@actions/core');
const github = require('@actions/github');

async function* getFiles(dir, blacklist = ['.git', 'node_modules', '__pycache__', '.DS_Store']) {
    // https://stackoverflow.com/a/45130990/2624391
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (blacklist.includes(dirent.name)) {
            // return;
        } else if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            yield res;
        }
    }
}

async function main() {
    try {
        const name = core.getInput('name')
        const repo = core.getInput('repo')
        const email = core.getInput('email')
        const pat = core.getInput('pat')
        const isOrg = core.getInput('org') == true
        let py_repo = core.getInput('py_repo')
        if (py_repo === '?') {
            py_repo = `${repo}.py`
        }
        
        const octokit = github.getOctokit(pat);
        const payload = {
            name: py_repo,
            auto_init: true, // needed if uploading via API rather than git push
            has_issues: false,
            has_projects: false,
            has_wiki: false
        };
        try {
            if (isOrg) {
                await octokit.request('POST /orgs/{org}/repos', { ...payload, ...{ org: name } })
            } else {
                await octokit.request('POST /user/repos', payload)
            }
        } catch (error) { // probably because repo already exists
            console.error(error)
        }
        fs.mkdtemp(path.join(os.tmpdir(), 'r2py-'), (err, folder) => {
            if (err) throw err;
            process.chdir(folder);
            execSync(`git config --global user.email ${email}`)
            execSync(`git config --global user.name ${name}`)
            execSync('git config --global init.defaultBranch main')
            execSync('git init')
            fs.copySync(`${__dirname}/../boilerplate/`, '.')
            fs.moveSync('PackageName', repo)
            replace.sync({
                files: 'setup.cfg',
                from: /PackageName/g,
                to: repo,
            })
            const man_files = path.join(process.env.GITHUB_WORKSPACE, 'man')
            fs.writeFileSync(`${repo}/__init__.py`, convert(repo, fs.readdirSync(man_files).map(x => `${man_files}/` + x)));
            // execSync('git add .')
            // execSync('git commit -m "first commit"')
            // execSync(`git remote add origin https://${name}:${password}@github.com/${name}/${repo}.py.git`)
            // execSync('git branch -M main')
            // execSync(`git push https://${name}:${password}@github.com/${name}/${repo}.py.git`)
            // instead of `git push` (which req's a password), upload each file individually via API
            (async () => {
                for await (const f of getFiles(folder)) {
                    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
                        owner: name,
                        repo: py_repo,
                        path: path.relative(folder, f),
                        message: 'BOT: PennSIVE/r2py run',
                        content: fs.readFileSync(f, { encoding: 'base64' })
                    })

                }
            })();
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
