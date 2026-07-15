# Email Verification Setup Guide

## Problem
Users are not receiving verification emails after registration.

## Root Causes & Solutions

### 1. Supabase Email Confirmation Settings

**Check your Supabase Dashboard:**

1. Go to **Authentication** → **Settings** → **Email Auth**
2. Look for **"Confirm email"** toggle
3. **Current Issue**: If this is ENABLED, Supabase requires email verification but may not be configured to send emails properly

**Solutions:**

#### Option A: Disable Email Confirmation (Quick Fix for Development)
- Turn OFF the **"Confirm email"** toggle
- This allows users to login immediately without verification
- **Recommended for**: Local development and testing

#### Option B: Configure Email Sending (Production Setup)
Keep email confirmation enabled but configure email delivery:

1. Go to **Project Settings** → **Auth** → **Email Templates**
2. Configure SMTP settings or use Supabase's default email service
3. Test email delivery

### 2. SMTP Configuration (For Production)

If you want to use your own email service (Gmail, SendGrid, etc.):

1. Navigate to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider:
   ```
   Host: smtp.gmail.com (for Gmail)
   Port: 587
   Username: your-email@gmail.com
   Password: your-app-password (NOT your regular password)
   Sender email: your-email@gmail.com
   Sender name: PetCare+
   ```

**For Gmail:**
- Enable 2-factor authentication
- Create an App Password (Google Account → Security → 2-Step Verification → App passwords)
- Use the app password in SMTP settings

### 3. Email Template Configuration

1. Go to **Authentication** → **Email Templates**
2. Check the **"Confirm signup"** template
3. Ensure the template is properly configured with:
   - Subject line
   - Proper confirmation URL: `{{ .ConfirmationURL }}`
   - Friendly content

**Default Template Should Include:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

### 4. Redirect URLs Configuration

1. Go to **Authentication** → **URL Configuration**
2. Add your app's redirect URLs:
   ```
   For Expo development:
   exp://localhost:8081
   
   For production:
   yourapp://
   https://yourdomain.com
   ```

### 5. Rate Limiting

Check if you've hit Supabase's rate limits:
1. Go to **Project Settings** → **API**
2. Check if rate limiting is blocking emails
3. Supabase free tier has email sending limits

### 6. Code-Level Fix (Temporary Workaround)

If you need to bypass email verification temporarily for testing:

**Update `src/auth/RegisterScreen.tsx`:**

After successful registration, you can skip directly to CompleteProfile:

```typescript
// In handleRegister function, after registration success:
showDialog({
  type: 'success',
  title: 'Account Created Successfully',
  message: 'Welcome to PetCare+!',
  autoDismissMs: 2200,
  onDismiss: () => {
    showDialog(null);
    // Skip email verification for testing
    navigation.replace('CompleteProfile', { role });
  },
});
```

## Recommended Development Setup

For the smoothest development experience:

1. **Disable email confirmation** in Supabase Auth settings
2. Update registration flow to skip EmailVerification screen
3. Go directly to CompleteProfile after registration

**Update RegisterScreen.tsx:**
```typescript
navigation.replace('CompleteProfile', { role });
// Instead of:
// navigation.replace('EmailVerification', { email: email.trim().toLowerCase(), role });
```

## Testing Email Delivery

Once configured, test with:

1. Register a new account with a real email address
2. Check the email inbox (and spam folder)
3. Look for email from `noreply@mail.app.supabase.co` (default) or your custom sender
4. Click the verification link
5. The app should detect verification automatically

## Supabase Dashboard Quick Links

- **Auth Settings**: https://xvgddddslgynglledskj.supabase.co/project/_/auth/settings
- **Email Templates**: https://xvgddddslgynglledskj.supabase.co/project/_/auth/templates
- **SMTP Settings**: https://xvgddddslgynglledskj.supabase.co/project/_/settings/auth

## Common Errors

### "Email not sent"
- Check SMTP configuration
- Verify sender email is valid
- Check rate limits

### "Invalid redirect URL"
- Add your app's URL to allowed redirect URLs
- For Expo: `exp://localhost:8081` or your custom scheme

### "Email rate limit exceeded"
- Wait for rate limit to reset (hourly/daily)
- Upgrade Supabase plan for higher limits

## Immediate Fix (For Your Current Issue)

**Quick Steps:**

1. Open Supabase Dashboard
2. Go to Authentication → Settings
3. **Disable "Confirm email"** toggle
4. Save settings
5. Try registering again

OR

Keep email confirmation but update code to skip verification screen temporarily:

**In `src/auth/RegisterScreen.tsx`, line ~162:**
```typescript
// Change this:
navigation.replace('EmailVerification', {
  email: email.trim().toLowerCase(),
  role,
});

// To this (temporary):
navigation.replace('CompleteProfile', { role });
```

This will let you continue testing while you configure proper email delivery.
