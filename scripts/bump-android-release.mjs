#!/usr/bin/env node
// Ricompila sempre da capo prima di incollare un numero di versione nuovo:
// il motivo per cui questo script esiste è un .aab vecchio (versionCode già
// usato) caricato per sbaglio su Google Play perché "sembrava" quello giusto
// (stesso percorso di sempre, solo con dentro il build di giorni prima).
// Bump di versione, build web, sync Android e bundleRelease sono un unico
// passo qui apposta: non c'è modo di eseguirli fuori sequenza e ritrovarsi
// con un .aab che non corrisponde al codice appena bumpato.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = join(root, "package.json");
const gradlePath = join(root, "android/app/build.gradle");

function bumpPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

const pkgText = readFileSync(pkgPath, "utf8");
const versionMatch = pkgText.match(/"version":\s*"(\d+\.\d+\.\d+)"/);
if (!versionMatch) throw new Error("versione non trovata in package.json");
const oldVersion = versionMatch[1];
const newVersion = bumpPatch(oldVersion);

const gradleText = readFileSync(gradlePath, "utf8");
const codeMatch = gradleText.match(/versionCode\s+(\d+)/);
if (!codeMatch) throw new Error("versionCode non trovato in android/app/build.gradle");
const oldCode = Number(codeMatch[1]);
const newCode = oldCode + 1;

console.log(`Bump ${oldVersion} (versionCode ${oldCode}) -> ${newVersion} (versionCode ${newCode})`);

writeFileSync(pkgPath, pkgText.replace(/"version":\s*"\d+\.\d+\.\d+"/, `"version": "${newVersion}"`));
writeFileSync(
  gradlePath,
  gradleText
    .replace(/versionCode\s+\d+/, `versionCode ${newCode}`)
    .replace(/versionName\s+"\d+\.\d+\.\d+"/, `versionName "${newVersion}"`)
);

// npm ci/install a questo punto riformatterebbe la sezione "build" di
// package.json (osservato più volte con questo progetto) — usare execFileSync
// diretto sui binari invece di "npm run" evita di reinstallare dipendenze e
// tocca solo i due file già aggiornati sopra.
function run(cmd, args, cwd = root) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

run("npx", ["vite", "build"]);
run("npx", ["cap", "sync", "android"]);
run("./gradlew", ["bundleRelease", "--offline"], join(root, "android"));

const aabPath = join(root, "android/app/build/outputs/bundle/release/app-release.aab");
console.log(`\nFatto: ${newVersion} (versionCode ${newCode})`);
console.log(`Bundle da caricare su Google Play: ${aabPath}`);
console.log(`Ricorda di committare package.json e android/app/build.gradle.`);
