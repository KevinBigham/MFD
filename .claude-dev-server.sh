#!/bin/bash
export PATH="/Users/tkevinbigham/.local/node-lts/bin:$PATH"
cd /Users/tkevinbigham/Projects/MFD/mfd
exec pnpm --filter @mfd/web exec vite --host
