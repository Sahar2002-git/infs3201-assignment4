/**
 * Sends a 2FA authentication code to the user
 * @param {string} username
 * @param {string} code
 */
function send2FACode(username, code) {

    console.log(`EMAIL TO ${username}: Your 2FA code is ${code}`);

}


/**
 * Sends suspicious activity warning email
 * @param {string} username
 */
function sendSuspiciousActivityEmail(username) {

    console.log(`EMAIL TO ${username}: Suspicious login attempts detected.`);

}


/**
 * Sends account locked email
 * @param {string} username
 */
function sendAccountLockedEmail(username) {

    console.log(`EMAIL TO ${username}: Your account has been locked after too many failed login attempts.`);

}


module.exports = {

    send2FACode,
    sendSuspiciousActivityEmail,
    sendAccountLockedEmail

};