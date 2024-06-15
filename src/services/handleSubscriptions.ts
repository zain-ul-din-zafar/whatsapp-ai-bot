import { Message } from "whatsapp-web.js";
import admin, { initializeApp } from "firebase-admin";
import { ServiceAccount, cert, getApps  } from "firebase-admin/app";
import { Query, Timestamp } from "firebase-admin/firestore";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ENV } from "../lib/env";

const firebaseAdminConfig = {
  credential: cert(ENV.adminCredentials as ServiceAccount),
};

export function initAdminSDK() {
  if (getApps().length <= 0) {
    initializeApp(firebaseAdminConfig);
  }
}

// map to handle cache, key: user_id, value: stale duration
const cache = new Map<string, Date>();
const CACHE_STALE_DURATION_IN_HOURS = 1 * 60 * 60 * 1000; // in ms

interface SubscriptionDetails {
  number: string;
  start_date: Timestamp;
  end_date: Timestamp;
  expired?: false;
}

export default async function handleSubscriptions(
  msg: Message
) {

  initAdminSDK();
  const sender = msg.from;
  
  try {

    const db = admin.firestore();
    const colRef = db.collection('subscriptions');
    const docRef = colRef.doc(sender);
    
    const now = new Date();
    if(cache.has(sender) && now < (cache.get(sender) as Date)) return;

    const userSubDocSnapShot = await docRef.get();
    
    if(!userSubDocSnapShot.exists) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      // subscribe new user
      await docRef.set({
        number: sender, 
        start_date: admin.firestore.Timestamp.fromDate(now),
        end_date: admin.firestore.Timestamp.fromDate(endDate),
        expired: false,
      } as SubscriptionDetails);

      msg.reply('✔ Your monthly subscription has been started');
    } else {
      // check user subscription
      const subDetails = userSubDocSnapShot.data() as SubscriptionDetails;
      const endDate = subDetails.end_date.toDate();
      const now = new Date();
      // get diff in the days
      const daysLeftToExpire = calculateRemainingDays(endDate);
      
      if(now > endDate) {
        // subscription has been expired
        msg.reply(`🔴 Your monthly subscription has been expired!`);
        await docRef.update({ expired: true });
        // black list number
        
      } else if(daysLeftToExpire <= 1) {
        sendReminder({ msg, sender });
      }

    }

    cache.set(sender, new Date(Date.now() + CACHE_STALE_DURATION_IN_HOURS));
  } catch(err) {
    console.log(err);
  }
}

let lastReminderSendedTime: { [key: string]: Date } = {};

function sendReminder({msg, sender }:{ msg: Message, sender: string }) {
  if(lastReminderSendedTime[sender] == undefined) {
    lastReminderSendedTime[sender] = new Date();
    return;
  }

  const lastTime = lastReminderSendedTime[sender];
  const timeNow = new Date();
  const timeDiff: number = timeNow.getTime() - lastTime.getTime();
  if(timeDiff < (1000 * 3600 * 1)) return;
  msg.reply(`⚠ Reminder: Your monthly subscription will be expired tomorrow!`);
}

function calculateRemainingDays(endDate: Date): number {
  const now = new Date();
  const timeDiff = endDate.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff;
}


export function listenSubscriptions() {
  initAdminSDK();
  admin.firestore()
  .collection('subscriptions')
  .where('expired', '==', false)
  .onSnapshot(snapShot => {
    const blackList = snapShot.docs.map(doc => doc.id);
    const filePath = join(process.cwd(), './blacklist.json');
    writeFileSync(filePath, JSON.stringify(blackList, null, 2), 'utf-8'); 
  });
}

export function hasValidSubscription({ sender }: { sender: string }) {
  const filePath = join(process.cwd(), './blacklist.json');
  if(!existsSync(filePath)) return true;
  const blackList = JSON.parse(readFileSync(filePath, 'utf-8')) as string[];
  return !blackList.includes(sender);
}
