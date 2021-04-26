#!/bin/bash

set -ex

if [ "$#" -ne 1 ]; then
    echo "Usage: ./run.sh github_username repo_name gh_email gh_password"
    exit 1
fi

if [ ! -e $GITHUB_WORKSPACE ]; then
    if [ ! -e /data ]; then
        echo "Must clone R package to /data"
    fi
    export GITHUB_WORKSPACE=/data
fi

repo_user=$1
repo_name=$2
gh_email=$3
gh_pass=$4
gh_repo_name=${repo_name}.py

curl -H "Authorization: token $GH_PAT" --data "{\"name\":\"${gh_repo_name}\"}" https://api.github.com/user/repos
wrkDir=$(mktemp -d)
cd $wrkDir
git config --global user.email $gh_email
git config --global user.name $repo_user
git config --global init.defaultBranch main
git init
cp -r /opt/r2py/boilerplate/* .
mv PackageName ${repo_name}
sed -i "s/PackageName/${repo_name}/g" setup.cfg
echo "Auto generated wrapper for ${repo_name}" > README.md
Rscript -e "source('/opt/r2py/R/transpile.R'); cat(transpile('${repo_name}', list.files(file.path(Sys.getenv('GITHUB_WORKSPACE'), 'man'), full.names = TRUE), file.path(Sys.getenv('GITHUB_WORKSPACE'), 'DESCRIPTION')))" > ${repo_name}/__init__.py
git add .
git commit -m "first commit"
# git remote add origin git@github.com:${repo_user}/${gh_repo_name}.git
git remote add origin https://${repo_user}:${gh_pass}@github.com/${repo_user}/${gh_repo_name}.git
git branch -M main
git push https://${repo_user}:${gh_pass}@github.com/${repo_user}/${gh_repo_name}.git
cd ..
rm -rf $wrkDir