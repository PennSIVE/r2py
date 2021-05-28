const fs = require('fs-extra');
const convert = require('./src/r2py.js');
const path = require('path');
const os = require('os');
const execSync = require('child_process').execSync;
const replace = require('replace-in-file');
const fetch = require('node-fetch');
const core = require('@actions/core');
const github = require('@actions/github');


async function main() {
    try {
        const username = core.getInput('username')
        const repo = core.getInput('repo')
        const email = core.getInput('email')
        const password = core.getInput('password')
        const pat = core.getInput('pat')
        await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${pat}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: `${repo}.py` })
        });
        fs.mkdtemp(path.join(os.tmpdir(), 'r2py-'), (err, folder) => {
            if (err) throw err;
            process.chdir(folder);
            execSync(`git config --global user.email ${email}`)
            execSync(`git config --global user.name ${username}`)
            execSync('git config --global init.defaultBranch main')
            execSync('git init')
            fs.copySync(`${__dirname}/boilerplate/`, '.')
            fs.moveSync('PackageName', repo)
            replace.sync({
                files: 'setup.cfg',
                from: /PackageName/g,
                to: repo,
            })
            fs.writeFileSync("README.md", `Auto generated wrapper for ${repo}`)
            const man_files = path.join(process.env.GITHUB_WORKSPACE, 'man')
            fs.writeFileSync(`${repo}/__init__.py`, convert(repo, fs.readdirSync(man_files).map(x => `${man_files}/` + x)));
            execSync('git add .')
            execSync('git commit -m "first commit"')
            execSync(`git remote add origin https://${username}:${password}@github.com/${username}/${repo}.py.git`)
            execSync('git branch -M main')
            execSync(`git push https://${username}:${password}@github.com/${username}/${repo}.py.git`)
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();

// console.log(convert('WhiteStripe', fs.readdirSync('../WhiteStripe/man/').map(x => '../WhiteStripe/man/' + x)))
// convert('WhiteStripe', ['../WhiteStripe/man/whitestripe.Rd'])
