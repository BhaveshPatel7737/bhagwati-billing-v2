# 🔐 Authentication Setup Instructions

## What Was Added

Your billing application now has **Supabase Authentication** with:
- Login page at `/login.html`
- Protected main application (requires login)
- Logout button on the main page
- Session management with Supabase Auth

## Files Added

1. **login.html** - Login page UI
2. **css/login.css** - Login page styling
3. **js/auth.js** - Authentication logic
4. **js/logout-button.js** - Logout button functionality

## Files Modified (Minimal Changes)

1. **index.html** - Added 3 script tags at the end:
   - Supabase JS CDN
   - auth.js
   - logout-button.js

2. **server.js** - Added 1 route:
   - `app.get('/login.html', ...)` to serve login page

## Setup Steps

### 1. Update Your Supabase Configuration

Open `js/auth.js` and replace the placeholder values:

```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your actual Supabase URL
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual anon key
```

**Where to find these:**
- Go to your Supabase project dashboard
- Settings → API
- Copy the `URL` and `anon/public` key

### 2. Enable Email Authentication in Supabase

1. Go to your Supabase Dashboard
2. Click **Authentication** → **Providers**
3. Enable **Email** provider
4. Configure email settings (you can use the default for testing)

### 3. Create Your First User

You have two options:

#### Option A: Via Supabase Dashboard (Recommended)
1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter email and password
4. Click **Create User**

#### Option B: Enable Sign-up (Optional)
If you want users to self-register, you can add a signup form. For now, manually create users via the dashboard for security.

### 4. Test the Authentication

1. Deploy your updated code to Render
2. Visit your application URL
3. You should be redirected to `/login.html`
4. Login with the credentials you created
5. After successful login, you'll be redirected to the main application
6. Click the **Logout** button in the top-right to sign out

## How It Works

### Protection Flow

1. **User visits any page** → `auth.js` checks if they have a valid session
2. **No session found** → Redirect to `/login.html`
3. **User logs in** → Supabase creates a session
4. **Session valid** → User can access the main application
5. **User clicks logout** → Session destroyed → Redirect to login

### Key Features

- **Session Persistence**: Once logged in, the session persists across browser refreshes
- **Automatic Redirect**: Unauthenticated users are automatically sent to login
- **Secure**: Uses Supabase's built-in authentication (industry standard)
- **No Backend Changes**: All auth logic is client-side using Supabase

## Customization Options

### Change Login Page Design

Edit `css/login.css` to change colors, layout, etc.

### Add More Auth Features

You can easily add:
- Password reset
- Email verification
- Remember me functionality
- Multi-factor authentication

All available through Supabase Auth!

### Restrict by User Role

If you want different user types (admin, viewer, etc.):
1. Add a `role` column in Supabase users metadata
2. Check the role in `auth.js`
3. Show/hide features based on role

## Troubleshooting

### "Login failed" error
- Check that your Supabase URL and key are correct in `js/auth.js`
- Verify the user exists in Supabase Dashboard
- Check browser console for detailed error messages

### Infinite redirect loop
- Clear browser cache and cookies
- Check that `auth.js` is loading properly (check browser console)

### Logout button not showing
- Check browser console for JavaScript errors
- Verify `js/logout-button.js` is loading

## Security Notes

- The `anon` key is safe to expose in frontend code
- Never expose your `service_role` key in frontend code
- Users can only access their own data (configure Row Level Security in Supabase)
- Sessions expire automatically (configurable in Supabase settings)

## Next Steps

1. Replace placeholder values in `js/auth.js` with your real Supabase credentials
2. Create at least one user in Supabase Dashboard
3. Push code to GitHub (already done!)
4. Deploy to Render
5. Test login functionality

---

✅ **Your existing billing functionality remains 100% unchanged!**

Only login protection was added on top of your working application.