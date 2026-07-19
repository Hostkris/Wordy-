# Wordy KDP Studio

Wordy is a no-signup, no-backend, GitHub Pages-ready book creation studio for authors preparing manuscripts and paperback files for Amazon KDP.

## What it does

- Book setup and blueprint generator
- AI Studio for book generation, rewriting, polishing, and humanizing text
- Chapter editor with local browser autosave
- KDP trim, bleed, margin, page count, spine, and cover wrap checks
- Live manuscript preview
- Direct browser-generated PDF download
- Editable DOCX export
- EPUB export for digital reading
- Wordy JSON backup and restore

## PDF export

Use **Download PDF** for a direct `.pdf` file generated in the browser. This is the primary export path.

Use **Print PDF** only when you specifically want the browser print dialog and system PDF controls.

For final publishing, always inspect the PDF inside KDP Previewer before upload.

## AI Studio

Wordy can connect to a CORS-enabled, OpenAI-compatible chat endpoint or a local AI server. Enter your endpoint, model, and optional API key in **AI Connection**.

AI settings are stored locally in the browser. If no AI connection is available, Wordy still builds high-quality prompts you can copy into your AI tool, then paste the result back into the app.

AI tools include:

- Generate a full book draft from guided inputs
- Polish or humanize the current chapter
- Rewrite pasted manuscript text
- Apply a generated draft to the book
- Replace the current chapter with polished text
- Insert AI output as a new chapter

## GitHub Pages deployment

1. Upload the contents of this folder to a GitHub repository.
2. Keep `index.html`, `styles.css`, `app.js`, `README.md`, and `.nojekyll` at the repository root.
3. Go to **Settings > Pages**.
4. Choose **Deploy from a branch**.
5. Select your main branch and root folder.

## Notes

- Your work is saved to `localStorage` in the same browser.
- Use **Save Backup** often if the book matters.
- Wordy sends manuscript text to an AI service only when you connect an endpoint and run an AI action.

## License

MIT. Use it, modify it, and ship it.
