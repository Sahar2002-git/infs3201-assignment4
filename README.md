Assignment 5 Features Implemented

Authentication Enhancements:
- Two-factor authentication using 6-digit email code
- Code expires after 3 minutes
- Suspicious activity email after 3 failed login attempts
- Account locked after 10 failed attempts
- Session starts only after successful 2FA verification

Document Upload System:
- Upload PDF documents per employee
- Maximum file size: 2MB
- Maximum 5 documents per employee
- Files stored securely in filesystem
- Documents accessible only after authentication
- Secure protected download route implemented