# 📸 How to Add Your Onboarding Images

## Quick Steps

### 1️⃣ Save Your Images

Save the 2 photos you have as:

```
c:\Users\chara\Downloads\Pet\assets\images\onboarding1.jpg
c:\Users\chara\Downloads\Pet\assets\images\onboarding2.jpg
```

**Image 1** (Puppy with vet) → `onboarding1.jpg`  
**Image 2** (Dog and cat) → `onboarding2.jpg`

### 2️⃣ Update Image Extension (if using PNG)

If you saved as `.png` instead of `.jpg`, update this file:

**File:** `src/auth/OnboardingScreen.tsx`

**Change:**
```typescript
// Line 22-23
image: require('../../assets/images/onboarding1.jpg'),
image: require('../../assets/images/onboarding2.jpg'),
```

**To:**
```typescript
image: require('../../assets/images/onboarding1.png'),
image: require('../../assets/images/onboarding2.png'),
```

### 3️⃣ Reload App

In Expo Go:
- **Shake device** → Tap **"Reload"**

Or in terminal:
- Press **`r`** to reload

---

## ✅ What Happens

- **Screen 1** → Shows puppy with vet photo
- **Screen 2** → Shows dog and cat photo  
- **Screen 3** → Shows animated illustration (all services)

---

## 🎨 Image Guidelines

- **Recommended size:** 1080x1080px
- **Format:** JPG or PNG
- **Aspect ratio:** Square (1:1) or 4:3
- **File size:** Under 2MB each

---

## 🐛 Troubleshooting

### Image not showing?

1. **Check file names exactly match:**
   - `onboarding1.jpg` (all lowercase)
   - `onboarding2.jpg` (all lowercase)

2. **Check file location:**
   - Files must be in `assets/images/` folder
   - NOT in `src/assets/` or `src/components/`

3. **Reload app completely:**
   - Close Expo Go
   - In terminal: Press `Ctrl+C` to stop server
   - Run `npx expo start` again
   - Reopen in Expo Go

4. **Check file extension in code:**
   - If you saved as `.png`, update the `require()` statements
   - Make sure extension matches actual file

5. **Clear cache:**
   ```bash
   npx expo start --clear
   ```

---

## 🔄 Alternative: Use Illustrations

If you prefer the animated illustrations instead of photos, revert the changes:

**File:** `src/auth/OnboardingScreen.tsx`

**Change:**
```typescript
{
  id: '1',
  title: 'We care like you do',
  subtitle: '...',
  image: require('../../assets/images/onboarding1.jpg'), // Remove this
  illustration: <OnboardingIllustration1 />, // Add this back
},
```

---

## ✅ Current Status

- ✅ `assets/images/` folder created
- ✅ Code updated to use images
- ⏳ **Waiting for you to save the images**

Once you save the images and reload, they'll appear automatically!

---

**Need help?** Check the console for errors or contact support.
