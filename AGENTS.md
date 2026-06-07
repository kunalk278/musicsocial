<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Conventions

## City input fields
Always use `@/components/CityAutocomplete` for any city selection field. Never use a plain `<input type="text">` for city. The component handles the US metros list, dropdown, and keyboard/blur behavior.
