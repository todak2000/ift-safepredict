# IFT-SafePredict — Manual Test Guide

This guide walks through every feature. Run the dev server first:

```bash
cd ift-safepredict
yarn dev
```

Open the URL shown in terminal (typically `http://localhost:5173/`).

---

## 1. Core Prediction  

- [ ] **Brine required**: Leave brine type blank → Predict button stays greyed out, error text in red
- [ ] **Predict IFT**: Select `NaCl`, enter P=15, T=350, keep defaults → click Predict IFT
- [ ] **Results appear**: Three-column P10 / P50 / P90 with values in mN/m
- [ ] **Regime badge**: Shows "Supercritical" (blue) or "Subcritical" (purple) in the input card header
- [ ] **QA badge**: Shows GREEN/YELLOW/RED with message below results
- [ ] **EOS tag**: "Δρ EOS-estimated" badge appears in results since drho auto-computed
- [ ] **Pr/Tr display**: Shows at bottom of results card

## 2. Input History (IndexedDB)

- [ ] **Auto-save**: After predicting, expand the "Input History" section below the chart — shows the prediction you just ran
- [ ] **Reload inputs**: Click any history entry → inputs repopulate; click Predict again
- [ ] **Delete**: Click the ✕ button on any history entry → it disappears
- [ ] **Clear all**: Click "Clear All History" → list empties
- [ ] **Persistence**: Refresh the page → expand Input History → previous entries still there

## 3. Shareable URLs

- [ ] **URL updates**: After predicting, the browser URL ends with `#P=15&T=350&brine=NaCl…`
- [ ] **Share button**: In Results card, click "🔗 Share" → "✓ Copied" flashes
- [ ] **Open shared link**: Copy the full URL, paste in a new tab → inputs auto-populate and auto-predict
- [ ] **Cross-device**: Send the link to a colleague (or different browser) → same result

## 4. Reservoir Presets

- [ ] **Preset dropdown**: At top of input card, select "Sleipner (Utsira Fm, North Sea)" → all inputs populate
- [ ] **Predict from preset**: Click Predict → realistic result for Sleipner conditions
- [ ] **All 13 presets work**: Try a few: Snøhvit, Quest, Gorgon, Pure Water → each gives reasonable IFT
- [ ] **Preset clears selection**: After selecting a preset, dropdown resets to "Select a CCUS formation…"

## 5. Depth Converter

- [ ] **Expand**: Click "Depth → Pressure & Temperature converter" in input card
- [ ] **Default values**: Shows depth=1500m, 25°C/km gradient, 10 MPa/km gradient
- [ ] **Preview**: Shows T ≈ 52.5°C (325.6 K) and P ≈ 15.00 MPa
- [ ] **Apply**: Click "Apply P & T" → P and T input fields update
- [ ] **Custom values**: Change depth to 3000m → shows T ≈ 90°C → Apply → fields update again
- [ ] **Unit-aware**: Switch units to "Field (bar, °C)" → depth preview shows °C and bar correctly

## 6. Sensitivity Analysis (Tornado Chart)

- [ ] **Shows after predict**: Below Uncertainty Chart, "Sensitivity Analysis" card appears
- [ ] **Baseline IFT**: Shows "Baseline IFT = XX.XX mN/m"
- [ ] **Tornado bars**: Horizontal bars showing ΔIFT when each parameter varies min→max
- [ ] **Sorted by impact**: Most impactful parameter at top
- [ ] **Color coding**: Blue = decreases IFT, Red = increases IFT
- [ ] **Resolution selector**: Change from 5 to 10 steps → bars update noticeably
- [ ] **Re-predict**: Change inputs and re-predict → sensitivity chart updates

## 7. P–T Contour Map

- [ ] **Tab**: Click "P–T Map" tab
- [ ] **Heatmap renders**: Colored grid shown with P on x-axis, T on y-axis
- [ ] **Color bar**: Right side shows IFT color scale (blue=low, red=high)
- [ ] **Regime boundary**: White dashed lines show supercritical boundary
- [ ] **Critical point**: White dot with "Critical point" label near bottom-left
- [ ] **Hover tooltip**: Move mouse over any cell → tooltip shows P, T, IFT, regime
- [ ] **Click to select**: Click any cell → switches to Predict tab with that P, T loaded
- [ ] **Range controls**: Change P range to 10–30, T range to 310–360 → map refocuses
- [ ] **Inverse mode**: Check "Show safe zone" → cells where IFT ≤ target are highlighted white
- [ ] **Target IFT**: Change target to 20 mN/m → highlighted zone shrinks
- [ ] **Unit-aware**: Switch to "Field (bar, °C)" → axis labels and range inputs update

## 8. Batch Predict

- [ ] **Tab**: Click "Batch Predict" tab
- [ ] **Upload prompt**: Shows upload area with CSV requirements
- [ ] **Test CSV**: Create a file `test_batch.csv` with:

```csv
P,T,salinity,MCM,BCM,x_CH4,x_N2,brineType
10,320,1.0,1.0,0,0,0,NaCl
15,330,2.0,2.0,0.5,0.05,0.02,NaCl+CaCl2
25,370,3.5,3.0,0.5,0.1,0.01,NaCl
5,300,0.5,0.5,0,0,0,Water
```

- [ ] **Upload**: Click "📂 Upload CSV" → select file → shows "4 rows loaded"
- [ ] **Run batch**: Click "Run Batch Prediction (4 rows)" → progress bar fills 25%, 50%, 75%, 100%
- [ ] **Results table**: Shows 4 rows with P, T, brine, regime, P50, P10, P90, QA, UIF
- [ ] **Download CSV**: Click "↓ Download CSV" → saves CSV file with all results
- [ ] **Download JSON**: Click "↓ Download JSON" → saves JSON with all results
- [ ] **Error handling**: Test with missing required column → alert "Missing required column"

## 9. CO₂ Storage Capacity Estimator

- [ ] **Shows after predict**: Below Sensitivity Analysis in Predict tab
- [ ] **Auto-calculates**: Trapping Efficiency derived from IFT using power-law model
- [ ] **Stat cards**: Shows IFT, Trapping Efficiency %, Storage Capacity (Mt CO₂)
- [ ] **Adjust inputs**: Change area to 500 km², thickness to 100m → storage capacity updates
- [ ] **Scenario comparison**: Lower IFT → higher trapping efficiency → more storage
- [ ] **Summary text**: Reads "A 500 km² × 100m reservoir could store ~X Mt CO₂"

## 10. Light/Dark Theme

- [ ] **Toggle**: Click ☀️ button in header → page switches to light theme immediately
- [ ] **Light appearance**: White cards, dark text, softer borders — readable in bright room
- [ ] **Toggle back**: Click 🌙 → returns to dark theme
- [ ] **Persistence**: Refresh the page → theme stays as last selected
- [ ] **All components themed**: Check that input fields, cards, charts, tables all look correct in both themes
- [ ] **No flash**: On reload, page loads in correct theme instantly (no white flash)

## 11. Unit System

- [ ] **Default**: Starts in "SI (MPa, K)"
- [ ] **Switch to Field**: Select "Field (bar, °C)" → P shows in bar, T shows in °C
- [ ] **Predict in Field units**: Set P=150 bar, T=50°C → predict → converts internally
- [ ] **Switch to US**: Select "US (psi, °F)" → P in psi, T in °F
- [ ] **Verify conversion**: 15 MPa → ~2175 psi, 323 K → ~122°F
- [ ] **Unit persistence**: Refresh → unit system stays
- [ ] **Contour Map units**: P–T Map tab axes and range inputs match current unit system
- [ ] **Depth Converter**: Preview values in the current unit system

## 12. Keyboard Shortcuts

- [ ] **Ctrl+Enter**: While on Predict tab, press Ctrl+Enter → triggers prediction
- [ ] **Cmd+Enter** (Mac): Same as Ctrl+Enter on macOS
- [ ] **Escape**: Press Escape → all inputs reset to defaults, result clears
- [ ] **Shortcut hint**: "Ctrl+Enter to predict · Escape to reset" shown below Predict button

## 13. Input Validation

- [ ] **P out of domain**: Set P=70 → ⚠ icon on Pressure field, "Domain: 0.1–60 MPa" hint
- [ ] **T out of domain**: Set T=550K (or 277°C) → ⚠ on Temperature field
- [ ] **Yellow border**: Out-of-domain fields get yellow border
- [ ] **Still predicts**: Prediction still runs (QA shows RED for extrapolation)
- [ ] **Unit-aware**: Switch to bar → domain shows in bar (1–600 bar)

## 14. Export Features

- [ ] **CSV export**: After predicting, click "↓ CSV" → downloads `.csv` with inputs + results
- [ ] **PDF export**: Click "↓ PDF" → downloads formatted PDF report

## 15. Uncertainty Chart

- [ ] **Shows after first prediction**: Prediction History chart renders below results
- [ ] **Updates**: Run 3+ predictions with different values → chart shows multiple lines
- [ ] **Uncertainty band**: Shaded area between P10–P90 visible
- [ ] **Color by QA**: P50 line color matches GREEN/YELLOW/RED status

## 16. Scenario Comparison

- [ ] **Save scenarios**: After predicting, click "+ Save to comparison" → "Scenario 1" saved
- [ ] **Save up to 3**: Save 3 scenarios → button shows "(max 3)" and disables
- [ ] **Compare tab**: Switch to "Compare Scenarios" → shows 3 scenario cards side-by-side
- [ ] **Remove**: Click ✕ on any scenario → removed
- [ ] **Export comparison**: "↓ Export CSV" → downloads CSV with all scenarios

## 17. Equations Tab

- [ ] **Renders LaTeX**: Click "Equations" → 7 sections of properly rendered equations
- [ ] **Scrolling**: Tables and equations scrollable horizontally on narrow screens

## 18. About Tab

- [ ] **Model info**: Shows model versions, nRMSE values
- [ ] **Citation**: Shows paper citation ready to copy
- [ ] **Privacy notice**: States "100% client-side"

## 19. Analytics Dashboard (standalone admin page)

The Analytics page is a **standalone page** at `/analytics.html`, completely separate from the main app.

### Setup (one time)
- [ ] **Deploy Apps Script**: Open your Google Sheet → Extensions → Apps Script → paste Code.gs → Deploy as Web App ("Anyone") → copy URL
- [ ] **Configure**: Paste the URL into `public/analytics.js` (line `const APPS_SCRIPT_URL = '...'`)
- [ ] **Authorize**: Visit the deployment URL in a browser, authorize the script (required once)
- [ ] **Password**: Both `analytics.js` and `Code.gs` must use the same password

### Testing login
- [ ] **Visit `/analytics.html`**: Standalone page loads with a centered login card (dark theme, sleeker than before)
- [ ] **Password visibility**: Click the eye icon 👁 to toggle password text visibility (changes to eye-off icon)
- [ ] **Wrong password**: Enter wrong password → "Wrong password" error in red
- [ ] **Correct password**: Enter password → spinner shows while connecting → dashboard loads
- [ ] **Server not reachable**: If the Apps Script URL is wrong or un-deployed, shows error + troubleshooting help + direct link to authorize the script
- [ ] **Logout**: Click "Logout" → returns to login screen

### Testing dashboard
- [ ] **Summary cards**: Total Visits, Unique IPs, Today, Avg Session Duration
- [ ] **Chart: Page views over time**: Line chart (blue fill) loads from Chart.js CDN
- [ ] **Chart: Devices**: Doughnut chart showing Desktop/Mobile/Tablet breakdown
- [ ] **Top Pages table**: Sorted by view count
- [ ] **Countries table**: Sorted by visit count
- [ ] **Recent Visitors table**: Shows last 30: Time, IP, Country, City, Device, Page, Duration
- [ ] **Debug section**: At the bottom (hidden data card), shows raw JSON summary of what the API returned

---

## Regression Tests

Before deploying, run the automated suite:

```bash
yarn test
```

Expected output: `Tests: 15 passed`

And verify the build still works:

```bash
yarn build
```

Expected: `✓ built in X.XXs` with no errors.
