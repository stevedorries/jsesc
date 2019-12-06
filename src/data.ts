import { regenerate } from "./deps.ts";

export const whitelist = regenerate()
  .addRange(0x20, 0x7e) // printable ASCII symbols
  .remove('"') // not `"`
  .remove("'") // not `'`
  .remove("\\") // not `\`
  .remove("`") // not '`'
  .toString();

export const version = "1.0.0";
