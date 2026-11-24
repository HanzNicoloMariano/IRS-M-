# Incident Reporting System (Labs 1 to 63)
Hanz Nicolo C Mariano - BSIT 3A

## Files
index.html, style.css, script.js (Labs 1-33), access.js (34-37), reports.js (38-45), quality.js (27-33, 46-59)

## Run
Open index.html in a browser, or from this folder run: `python -m http.server 8000` and open http://localhost:8000

## Accounts (password for all: Pass1234, change before real use)
admin, reporter, officer, investigator, actionofficer, supervisor, management

## Deploy (Labs 57 and 58)
Local server: python -m http.server 8000
School server: copy the 6 files above into the web folder (Apache htdocs, Nginx html, IIS wwwroot)
Cloud: upload the same files to GitHub Pages or Netlify (HTTPS)
Then log in as admin: Deployment page -> clear checklist -> Run Post-Deployment Test.

## Notes
Data is stored in the browser (localStorage), so each browser has its own database. Use Backup to move data.
