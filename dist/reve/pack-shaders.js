#!/usr/bin/env node
const fs = require('fs');
const os = require("os");

const input = "program_names.json";
const output = "shaders/programs.json";

const src_dir = "../../src/";
const shaders_dir = src_dir + "shaders/";

const dir_name_re = new RegExp("^(.*/)([^/]+)$");

let name_list = JSON.parse(fs.readFileSync(input));

let shaders = JSON.parse(fs.readFileSync(shaders_dir + "programs.json"));
// console.log(shaders);

function stat(name) {
    try {
        return fs.statSync(name);
    } catch (err) {
        return null;
    }
}

let result = {};
for (let name of name_list) {
    if (shaders[name]) {
        let shdr = shaders[name];
        result[name] = shdr;

        // console.log("Adding shader", shdr);

        for (let type in shdr.shaders) {
            let ss = shdr.shaders[type];
            let res = ss.match(dir_name_re);
            // console.log(res);

            // Copy the required file into local sub-dir.
            let out_dir = 'shaders/' + res[1];

            const dstat = stat(out_dir);
            if (!dstat) {
                console.log("Making dir", out_dir);
                fs.mkdirSync(out_dir, { recursive: true, force: true });
            }

            fs.copyFileSync(shaders_dir + ss, out_dir + res[2]);
        }
    }
}

fs.writeFileSync(output, JSON.stringify(result, null, 2));
