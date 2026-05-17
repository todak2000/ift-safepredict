# IFT SafePredict Tool

Welcome to the `ift-safepredict` tool! This is a web application built with React and Vite that predicts the Interfacial Tension (IFT) of CO₂-Brine systems using high-precision MARS (Multivariate Adaptive Regression Splines) machine learning models.

**Models:** Sub-MARS-16t (subcritical) · Sup-MARS-35t (supercritical) · 80% conformal prediction interval

This guide is written for beginners to help you run the app on your own computer and publish it to the internet for free using GitHub Pages.

---

## 🚀 1. How to Start the App Locally

To test and view the app on your own computer, you need to start the "development server". 

1. Open your Mac **Terminal**.
2. Navigate to this folder by typing:
   ```bash
   cd ift-safepredict
   ```
3. Install the required dependencies (you only need to do this once):
   ```bash
   yarn install
   ```
4. Start the application:
   ```bash
   yarn dev
   ```
5. Open your web browser (like Chrome or Safari) and go to the link shown in the terminal, which is usually: **`http://localhost:5173`**

---

## 🌍 2. How to Deploy to GitHub Pages (For Free)

If you want to share this tool with the public, you can host it for free using **GitHub Pages**. Everything is already configured behind the scenes! Just follow these steps:

### Step A: Create a Repository on GitHub
1. Go to [GitHub.com](https://github.com/) and log in to your account.
2. Click the **"+"** icon in the top right corner and select **New repository**.
3. Name the repository exactly: **`ift-safepredict`**
4. Make sure it is set to **Public**.
5. **Very Important:** Do *not* check any boxes to add a README, `.gitignore`, or license. Leave it completely empty and click **Create repository**.

### Step B: Push Your Code from the Terminal
Open your terminal, ensure you are still in the `ift-safepredict` folder, and type these exactly as shown (replace `YOUR_GITHUB_USERNAME` with your actual username):

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ift-safepredict.git
git branch -M main
git push -u origin main
```
*(It may ask you to log in to GitHub on your terminal).*

### Step C: Watch it Go Live!
1. Go back to your new repository on GitHub.com.
2. Click on the **Actions** tab at the top. You will see a workflow running called "Deploy to GitHub Pages".
3. Wait about 1-2 minutes for it to finish (it will turn green).
4. Your website is now live! You can view it at:
   **`https://YOUR_GITHUB_USERNAME.github.io/ift-safepredict/`**

---

## 🛠️ 3. How to Update the App Later

If you ever make changes to the code (like changing a color or updating text) and want to publish the updates to your live website:

1. Open the terminal in the `ift-safepredict` folder.
2. Add your changes:
   ```bash
   git add .
   ```
3. Save your changes with a message:
   ```bash
   git commit -m "Updated the app"
   ```
4. Send the updates to GitHub:
   ```bash
   git push
   ```
GitHub will automatically rebuild and update your live website within a couple of minutes!

---

## 📋 4. Additional CLI Scripts

| Command | What it does |
|---|---|
| `yarn build` | Generate Excel companion tool + production build → `dist/` |
| `yarn test` | Run Jest unit tests (MARS equations, scalers, QA validator) |
| `node tests/test_validation.js` | Run end-to-end validation against curated test dataset |

### Generate the Excel Companion Tool

The Excel workbook contains all MARS formulas ready-to-use in Excel (no macros required). Generate it with:

```bash
yarn build
# or just the Excel file:
yarn generate-excel
```

Output: `public/IFT_SafePredict_v1.0.xlsx` (4 sheets: INPUT, MARS_ENGINE, SCALERS, INSTRUCTIONS)

The Excel tool is also automatically generated every time you run `yarn build`.

### Run the Tests

```bash
yarn test          # 15 unit tests (equations, bounds, QA logic)
```

For a full validation across the curated 433-record dataset:

```bash
node tests/test_validation.js
```

This validates predictions against all 7 brine types, CH₄/N₂ impurities, both regimes, and 15 laboratory sources.

---

## 📁 Project Structure

```
ift-safepredict/
├── src/
│   ├── logic/
│   │   ├── marsEngine.js      # MARS hinge functions (sub 16t + sup 35t)
│   │   ├── scalers.js          # MinMax scaler bounds per regime
│   │   ├── predict.js          # Prediction pipeline
│   │   ├── qaValidator.js      # Conformal UQ / UIF escalation
│   │   ├── eosEngine.js        # Optional EOS density estimation
│   │   └── exportEngine.js     # CSV/PDF export
│   ├── components/             # React UI components
│   └── App.jsx                 # Root app with 4 tabs
├── scripts/
│   └── generateExcel.cjs       # Excel workbook generator
├── tests/
│   ├── marsEngine.test.cjs     # Jest unit tests
│   ├── test_validation.js      # End-to-end validation
│   └── test_data.csv           # 433-row curated dataset
└── .github/workflows/
    └── deploy.yml              # GitHub Pages auto-deploy
```

---

## 🔒 Privacy

This tool is 100% client-side. All computation runs in your browser. No data is transmitted to any server.

---

## 📄 Citation

> Olagunju, D. et al. (2026). *Closed-Form MARS Equations with Calibrated Conformal Uncertainty for CO₂–Brine Interfacial Tension Prediction in Geological Carbon Storage.*
