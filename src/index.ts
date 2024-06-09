import { WhatsAppClient } from './lib/WhatsAppClient';
import handleSubscriptions from './services/handleSubscriptions';

console.log('🤖 starting client...');
const whatsappClient = new WhatsAppClient();
whatsappClient.initializeClient();

whatsappClient.onClientStartAskingAI((msg)=> handleSubscriptions(msg));
