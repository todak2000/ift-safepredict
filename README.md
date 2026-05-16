# IFT SafePredict Tool

Welcome to the `ift-safepredict` tool! This is a web application built with React and Vite that predicts the Interfacial Tension (IFT) of CO₂-Brine systems using high-precision MARS (Multivariate Adaptive Regression Splines) machine learning models.

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
Open your terminal, ensure you are still in the `/Users/todak2000/Desktop/codebase/ift_v4/ift-safepredict` folder, and type these exactly as shown (replace `YOUR_GITHUB_USERNAME` with your actual username):

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
