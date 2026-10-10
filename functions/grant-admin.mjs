/** Once per project: cd functions && node grant-admin.mjs */
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const EMAIL='tranthiquynhnhu0901@gmail.com';
if(!process.env.GOOGLE_CLOUD_PROJECT){throw new Error('Set GOOGLE_CLOUD_PROJECT=your-project-id')} 
initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT});
const auth=getAuth();const user=await auth.getUserByEmail(EMAIL);
if(!user.emailVerified)throw new Error('Google email must be verified before admin is granted.');
await auth.setCustomUserClaims(user.uid,{...(user.customClaims||{}),admin:true});
console.log('Admin custom claim granted to verified UID:',user.uid,'(sign out and in again)');
