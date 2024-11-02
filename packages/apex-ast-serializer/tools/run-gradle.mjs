#!/usr/bin/env zx
import { $, usePowerShell } from "zx";
$.verbose = true;

// This script runs Gradle with the given arguments in a cross-platform way.
// It's meant to be called from nx run-commands.

let command = "./gradlew";

if (process.platform === "win32") {
  usePowerShell();
  command += ".bat";
}
const args = process.argv.slice(2);
await $`${command} ${args}`.stdio("ignore");
