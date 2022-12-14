#!/usr/bin/env node

const fs = require('fs');
const os = require("os");

const output = "program_names.json";

const args = process.argv.slice(2);

let prog_names = new Set();
for (let a of args) {
    a.replace("~", os.homedir);
    let name_list = JSON.parse(fs.readFileSync(a));
    for (let name of name_list) {
        prog_names.add(name);
    }
}
// console.log(prog_names);

let names = [];
for (const p of prog_names) names.push(p);
fs.writeFileSync(output, JSON.stringify(names, null, 2));
