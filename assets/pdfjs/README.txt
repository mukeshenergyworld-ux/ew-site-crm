pdf.js 3.11.174 (Mozilla, Apache-2.0), legacy build.
Vendored, not loaded from a CDN, for one reason measured on 30 Aug 2026:
a worker fetched cross-origin from cdnjs never starts, and pdf.js then hangs
for ever with no error in the console. Same origin works first time.
Loaded only when a statement is exported with receipts attached.
