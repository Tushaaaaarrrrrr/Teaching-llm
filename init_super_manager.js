const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-fallback-key-32-bytes-long!';
const IV_LENGTH = 16;

function encryptPassword(text) {
  if (!text) return '';
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function initSuperManager() {
  const email = "lkiitmng2428@gmail.com";
  
  try {
    let user = await prisma.user.findUnique({ where: { email } });
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const encryptedTempPassword = encryptPassword(tempPassword);

    if (user) {
      if (!user.isSuperManager) {
        user = await prisma.user.update({
          where: { email },
          data: { 
            isSuperManager: true,
            role: 'MANAGER',
            passwordHash,
            encryptedTempPassword,
            passwordRevealCount: 0
          }
        });
        console.log(`User ${email} updated to Super Manager. Temporary password set to: ${tempPassword} (Please store safely, this is shown ONCE)`);
      } else {
        console.log(`User ${email} is already a Super Manager.`);
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: "Super Manager",
          role: 'MANAGER',
          isSuperManager: true,
          passwordHash,
          encryptedTempPassword,
          passwordRevealCount: 0
        }
      });
      console.log(`User ${email} created as Super Manager. Temporary password set to: ${tempPassword} (Please store safely, this is shown ONCE)`);
    }
  } catch (error) {
    console.error("Error initializing super manager:", error);
  } finally {
    await prisma.$disconnect();
  }
}

initSuperManager();
