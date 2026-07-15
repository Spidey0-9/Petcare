#!/usr/bin/env node
/**
 * Email Verification Test Script
 * 
 * This script tests your Supabase email configuration by:
 * 1. Checking if email confirmation is required
 * 2. Attempting to send a test verification email
 * 3. Reporting any configuration issues
 * 
 * Usage:
 *   node scripts/test-email-verification.mjs your-test-email@example.com
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(projectRoot, '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailVerification(testEmail) {
  console.log('\n🔍 Testing Supabase Email Verification Configuration\n');
  console.log('━'.repeat(60));
  
  try {
    // Step 1: Check Supabase connection
    console.log('\n1️⃣  Checking Supabase connection...');
    const { data: healthCheck, error: healthError } = await supabase.auth.getSession();
    if (healthError && healthError.message !== 'Auth session missing!') {
      console.error('   ❌ Connection failed:', healthError.message);
      return;
    }
    console.log('   ✅ Connected to Supabase');
    console.log('   📍 Project:', SUPABASE_URL);

    // Step 2: Try to register a test user
    console.log('\n2️⃣  Attempting to register test user...');
    console.log('   📧 Email:', testEmail);
    
    const testPassword = 'TestPass123!@#';
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          role: 'pet_owner'
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('   ⚠️  Email already registered (this is OK for testing)');
        console.log('   💡 Trying to resend verification email...');
        
        // Try to resend verification
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: testEmail
        });
        
        if (resendError) {
          console.error('   ❌ Failed to resend:', resendError.message);
        } else {
          console.log('   ✅ Verification email sent!');
          console.log('   📬 Check your inbox:', testEmail);
        }
      } else {
        console.error('   ❌ Registration failed:', signUpError.message);
        
        // Provide specific guidance based on error
        if (signUpError.message.includes('Email rate limit')) {
          console.log('\n   💡 ISSUE: Email rate limit exceeded');
          console.log('   🔧 FIX: Wait a few minutes or upgrade your Supabase plan');
        } else if (signUpError.message.includes('SMTP')) {
          console.log('\n   💡 ISSUE: SMTP not configured');
          console.log('   🔧 FIX: Configure SMTP in Supabase Dashboard');
          console.log('   📍 Go to: Authentication → Settings → SMTP Settings');
        }
      }
      return;
    }

    // Step 3: Check if email confirmation is required
    console.log('\n3️⃣  Checking email confirmation settings...');
    
    if (signUpData.user && signUpData.session) {
      console.log('   ⚠️  Email confirmation is DISABLED');
      console.log('   ℹ️  Users can login immediately without verifying email');
      console.log('   💡 To enable: Supabase Dashboard → Auth → Settings → Enable email confirmations');
    } else if (signUpData.user && !signUpData.session) {
      console.log('   ✅ Email confirmation is ENABLED');
      console.log('   📧 Verification email should be sent to:', testEmail);
      console.log('   ⏰ Email should arrive within 1-2 minutes');
      console.log('   📁 Don\'t forget to check spam/junk folder!');
      
      if (signUpData.user.confirmation_sent_at) {
        console.log('   ✅ Confirmation email was sent at:', new Date(signUpData.user.confirmation_sent_at).toLocaleString());
      }
    }

    // Step 4: Provide next steps
    console.log('\n4️⃣  Next steps:');
    console.log('   1. Check email inbox for:', testEmail);
    console.log('   2. Look in spam/junk folder if not in inbox');
    console.log('   3. Click the verification link in the email');
    console.log('   4. Return to the app - it will detect verification');

    // Step 5: Configuration tips
    console.log('\n5️⃣  Configuration recommendations:');
    console.log('   📍 Supabase Dashboard: https://supabase.com/dashboard/project/' + SUPABASE_URL.split('//')[1].split('.')[0]);
    console.log('   \n   For Development:');
    console.log('   → Disable email confirmation for faster testing');
    console.log('   → Location: Authentication → Settings → Disable "Enable email confirmations"');
    console.log('   \n   For Production:');
    console.log('   → Configure custom SMTP for reliable delivery');
    console.log('   → Location: Settings → Auth → SMTP Settings');
    console.log('   → Recommended: Gmail SMTP with App Password');

    console.log('\n━'.repeat(60));
    console.log('✅ Email verification test complete!\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error('\n📚 Troubleshooting:');
    console.error('   1. Check .env file has correct Supabase credentials');
    console.error('   2. Verify Supabase project is active');
    console.error('   3. Check network connection');
    console.error('   4. Review Supabase Dashboard → Logs for errors\n');
  }
}

// Get test email from command line argument
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Usage: node scripts/test-email-verification.mjs <test-email@example.com>');
  console.error('   Example: node scripts/test-email-verification.mjs test@gmail.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Invalid email format:', testEmail);
  process.exit(1);
}

// Run the test
testEmailVerification(testEmail).catch(console.error);
