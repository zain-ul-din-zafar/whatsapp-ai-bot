import { WhatsAppClient } from './lib/WhatsAppClient';
import handleSubscriptions, { listenSubscriptions } from './services/handleSubscriptions';

console.log('🤖 starting client...');
const whatsappClient = new WhatsAppClient();
whatsappClient.initializeClient();

listenSubscriptions();
whatsappClient.onClientStartAskingAI((msg) => handleSubscriptions(msg));


