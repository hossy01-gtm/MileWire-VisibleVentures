# How I build (First Commit setup, done on 2026-10-21)

I'm Arman, building MileWire in First Commit. Claude runs my whole stack from the terminal.

## Accounts and tools
- GitHub: hossy01-gtm (this repo only), via the gh CLI. My global git identity is ArmanTR13 for other repos; never change global git, gh or Claude config from here.
- Vercel: via the Vercel MCP server (project-scoped in .mcp.json) and the vercel CLI (signed in with GitHub)
- Supabase: via the Supabase MCP server (project-scoped in .mcp.json). Project: <name> (<project ref>)
- Browser: Claude in Chrome. Start Claude Code with `claude --chrome`.

## The loop for every change
1. Make the change and run it locally if useful (`npm run dev`).
2. Commit with a clear message and push to main. Vercel deploys every push automatically.
3. Check the deployment until it's ready (Vercel MCP, or `vercel ls` / `vercel inspect <url> --logs`). If the build fails, read the build log, fix it, and push again.
4. Open the live site in Chrome and check the change works. Read the browser console for errors.
5. Tell me what changed, with the live link.

## Database
- Every change goes in a migration file in `supabase/migrations/` in the repo, applied through the Supabase MCP server. Never change tables by hand.
- Every new table: grants plus RLS plus policies in the same migration. Run the security advisors after each change and fix what they flag.
- The browser gets only the publishable key. The secret key stays server-side.

## Environment variables
- Set them in Vercel for production, preview and development (Vercel MCP or `vercel env add`), then redeploy, because changes only apply to new deployments.
- Pull them locally with `vercel env pull .env.local`. Never commit .env files.

## Always
- Never ask me to paste secrets into the chat.
- Ask before deleting anything or doing anything hard to undo.
- Explain what you're doing in plain language. I'm learning.
- If setup isn't finished, read first-commit-setup.md in this repo and continue where it left off.
