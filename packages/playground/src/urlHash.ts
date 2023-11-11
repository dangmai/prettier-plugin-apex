/* eslint-disable no-restricted-globals */
// This file is adapted from https://github.com/prettier/prettier/blob/main/website/playground/urlHash.js
import LZString from "lz-string";

export function getStateFromUrl<T>(): T | null {
  const hash = document.location.hash.slice(1);
  if (!hash) {
    return null;
  }

  // backwards support for old json encoded URIComponent
  const decode = hash.includes("%7B%22")
    ? decodeURIComponent
    : LZString.decompressFromEncodedURIComponent;

  try {
    return JSON.parse(decode(hash));
  } catch {
    return null;
  }
}

export function getUrlWithState(state: any): URL {
  const hash = LZString.compressToEncodedURIComponent(JSON.stringify(state));
  const url = new URL(location.href);
  url.hash = hash;
  return url;
}
