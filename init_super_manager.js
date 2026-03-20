const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function initSuperManager() {
  const email = "lkiitmng2428@gmail.com";
  
  try {
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (user.isSuperManager) {
        // Already a Super Manager — do NOT touch the password
        console.log(`✅ User ${email} is already a Super Manager. No changes made.`);
        return;
      }
      // Exists but not yet Super Manager — promote and set a new password
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await prisma.user.update({
        where: { email },
        data: { 
          isSuperManager: true,
          role: 'MANAGER',
          passwordHash
        }
      });
      console.log(`🔑 User ${email} promoted to Super Manager.`);
      console.log(`🔑 NEW PASSWORD: ${tempPassword}`);
      console.log(`⚠️  Store this password safely — it will NOT be shown again.`);
    } else {
      // User doesn't exist — create with a new password
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await prisma.user.create({
        data: {
          email,
          name: "Super Manager",
          role: 'MANAGER',
          isSuperManager: true,
          passwordHash,
          securityNumber: 'SEC' + crypto.randomBytes(4).toString('hex').toUpperCase()
        }
      });
      console.log(`🔑 User ${email} created as Super Manager.`);
      console.log(`🔑 NEW PASSWORD: ${tempPassword}`);
      console.log(`⚠️  Store this password safely — it will NOT be shown again.`);
    }
  } catch (error) {
    console.error("Error initializing super manager:", error);
  } finally {
    await prisma.$disconnect();
  }
}

initSuperManager();
