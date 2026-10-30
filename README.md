# Stipple Photocopy Maker 🎨

স্টপল ও হাফটোন ভেক্টর ফটো কপি মেকার — প্রফেশনাল ডেস্কটপ ও ওয়েব অ্যাপ্লিকেশন।

---

## 🛠️ প্রয়োজনীয় জিনিসপত্র (Prerequisites)

আপনার কম্পিউটারে **Node.js** ইন্সটল থাকতে হবে:
1. [Node.js ওয়েবসাইট](https://nodejs.org/) থেকে **LTS সংস্করণ** ডাউনলোড ও ইন্সটল করুন।
2. ইন্সটল সফল হয়েছে কিনা চেক করতে টার্মিনাল বা কমান্ড প্রম্পটে (CMD) লিখুন:
   ```bash
   node -v
   npm -v
   ```

---

## 🚀 কিভাবে সফটওয়্যার তৈরি ও চালু করবেন (Step-by-Step Guide)

আপনার নতুন ফোল্ডারে টার্মিনাল বা কমান্ড প্রম্পট (Command Prompt / PowerShell / VS Code Terminal) খুলুন:

### ধাপ ১: ডিপেন্ডেন্সি ইন্সটল করুন (Install Dependencies)
প্রথমে প্রজেক্টের প্রয়োজনীয় প্যাকেজগুলো ইন্সটল করতে হবে:
```bash
npm install
```
*(এই কমান্ডটি ইন্টারনেট থেকে সব প্রয়োজনীয় লাইব্রেরি যেমন React, Vite, Electron ইত্যাদি ডাউনলোড করে `node_modules` ফোল্ডারে রাখবে)*

---

### ধাপ ২: পছন্দ অনুযায়ী সফটওয়্যার চালান বা তৈরি করুন

#### পদ্ধতি ১: ব্রাউজারে দ্রুত চালু করতে (Local Web App)
```bash
npm run dev
```
কমান্ডটি চালু হওয়ার পর ব্রাউজারে যান:
👉 **`http://localhost:3000`**

---

#### পদ্ধতি ২: সরাসরি ডেস্কটপ উইন্ডো হিসেবে চালাতে (Run as Desktop App)
সফটওয়্যারটি কোনো ব্রাউজার ছাড়াই সরাসরি ডেস্কটপ উইন্ডো হিসেবে চালু হবে:
```bash
npm run electron:start
```

---

#### পদ্ধতি ৩: উইন্ডোজের জন্য `.exe` ইনস্টলার সফটওয়্যার তৈরি করতে (Windows Installer .exe)
ক্লায়েন্ট বা নিজের কম্পিউটারে ইন্সটল করার জন্য পূর্ণাঙ্গ সেটআপ ফাইল তৈরি করতে:
```bash
npm run installer
```
বিল্ড শেষ হলে আপনার প্রজেক্টের **`release/`** ফোল্ডারে পাবেন:
📦 **`Stipple Photocopy Maker Setup 1.0.0.exe`**

---

#### পদ্ধতি ৪: পোর্টেবল `.exe` তৈরি করতে (Single Portable .exe - কোনো ইন্সটলেশন ছাড়াই চলবে)
```bash
npm run pack:portable
```
বিল্ড শেষ হলে **`release/`** ফোল্ডারে একক পোর্টেবল `.exe` ফাইল তৈরি হবে, যেটিতে ডাবল ক্লিক করলেই সরাসরি সফটওয়্যার ওপেন হবে।

---

#### পদ্ধতি ৫: আনপ্যাকড ফোল্ডার তৈরি করতে (Ready-to-Run Directory)
```bash
npm run dist
```
বিল্ড শেষ হলে **`release/win-unpacked/`** ফোল্ডারে সরাসরি `Stipple Photocopy Maker.exe` তৈরি হবে।

---

## 💡 সাধারণ সমস্যার সমাধান (Troubleshooting)

1. **PowerShell-এ script execution error আসলে:**
   PowerShell Administrator মোডে খুলে চালান:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
2. **ইন্টারনেট সংযোগ:**
   প্রথমবার `npm install` করার সময় এবং প্রথমবার `npm run installer` চালানোর সময় সক্রিয় ইন্টারনেট সংযোগ প্রয়োজন (ইলেকট্রন বাইনারি ডাউনলোড করার জন্য)।
