export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  console.log(`[VERIFICATION] Code for ${email}: ${code}`);
}
