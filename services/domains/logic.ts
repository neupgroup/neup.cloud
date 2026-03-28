export function generateVerificationCode(length = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let verificationCode = '';

  for (let index = 0; index < length; index += 1) {
    verificationCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return verificationCode;
}
