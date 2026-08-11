// UI wiring
const cbTls = document.getElementById('cb_tls');
const cbMtls = document.getElementById('cb_mtls');
const cbSig = document.getElementById('cb_sig');
const cbAscon = document.getElementById('cb_ascon');

const tlsInputs = document.getElementById('tls_inputs');
const mtlsInputs = document.getElementById('mtls_inputs');
const sigInputs = document.getElementById('sig_inputs');
const asconInputs = document.getElementById('ascon_inputs');

const pubkeysEl = document.getElementById('pubkeys');
const selectorEl = document.getElementById('selector');
const genRandomBtn = document.getElementById('gen_random');
const plaintextEl = document.getElementById('plaintext');
const encryptBtn = document.getElementById('encrypt');
const outputEl = document.getElementById('output');
const clearBtn = document.getElementById('clear');
// MQTT UI
const mqttUrlEl = document.getElementById('mqtt_url');
const mqttClientIdEl = document.getElementById('mqtt_clientid');
const mqttUserEl = document.getElementById('mqtt_user');
const mqttPassEl = document.getElementById('mqtt_pass');
const mqttTopicPubEl = document.getElementById('mqtt_topic_pub');
const mqttTopicSubEl = document.getElementById('mqtt_topic_sub');
const btnConnect = document.getElementById('btn_connect');
const btnDisconnect = document.getElementById('btn_disconnect');
const btnSubscribe = document.getElementById('btn_subscribe');
const btnUnsubscribe = document.getElementById('btn_unsubscribe');

let mqttClient = null;
const appendLog = (txt)=>{ outputEl.value = txt+"\n" + outputEl.value };

function toggle(el, show){
  el.classList.toggle('hidden', !show);
}

cbTls.addEventListener('change', ()=> toggle(tlsInputs, cbTls.checked));
cbMtls.addEventListener('change', ()=> toggle(mtlsInputs, cbMtls.checked));
cbSig.addEventListener('change', ()=> toggle(sigInputs, cbSig.checked));
cbAscon.addEventListener('change', ()=> toggle(asconInputs, cbAscon.checked));

genRandomBtn.addEventListener('click',(e)=>{
  e.preventDefault();
  selectorEl.value = Array.from({length:5},()=>Math.floor(Math.random()*10)).join('');
});

clearBtn.addEventListener('click',()=>{
  pubkeysEl.value=''; selectorEl.value=''; plaintextEl.value=''; outputEl.value='';
});

// Helpers: parse hex or base64 to Uint8Array
function hexToBytes(hex){
  hex = hex.replace(/[^0-9a-fA-F]/g,'');
  if(hex.length%2) hex = '0'+hex;
  const len = hex.length/2; const out = new Uint8Array(len);
  for(let i=0;i<len;i++) out[i]=parseInt(hex.substr(i*2,2),16);
  return out;
}
function base64ToBytes(b64){
  const bin = atob(b64.replace(/\s+/g,''));
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return arr;
}
function tryParseKey(str){
  str = str.trim();
  if(!str) return null;
  try{ if(/^([0-9a-fA-F\s]+)$/.test(str)) return hexToBytes(str);
  }catch(e){}
  try{ return base64ToBytes(str); }catch(e){}
  return null;
}

function xorBuffers(bufs){
  if(!bufs.length) return new Uint8Array(0);
  let maxLen = Math.max(...bufs.map(b=>b.length));
  const out = new Uint8Array(maxLen);
  for(let i=0;i<maxLen;i++){
    let v=0;
    for(const b of bufs) v ^= (b[i]||0);
    out[i]=v;
  }
  return out;
}

async function asconAead128Encrypt(plainBytes, keyBytes, associatedData){
  // Placeholder implementation: WebCrypto AES-GCM using 128-bit key.
  // NOTE: This is NOT Ascon-AEAD128; replace with a proper Ascon implementation when available.
  const key128 = keyBytes.slice(0,16);
  const cryptoKey = await crypto.subtle.importKey('raw', key128, {name:'AES-GCM'}, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData: associatedData||new Uint8Array(), tagLength:128}, cryptoKey, plainBytes);
  const ct = new Uint8Array(cipher);
  // return iv + ciphertext
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv,0); out.set(ct, iv.length);
  return out;
}

function bytesToBase64(bytes){
  let s='';
  for(let i=0;i<bytes.length;i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

encryptBtn.addEventListener('click', async ()=>{
  outputEl.value='';

  if(!cbAscon.checked){
    outputEl.value = JSON.stringify({com:1, value: plaintextEl.value});
    return;
  }

  // read pubkeys
  const lines = pubkeysEl.value.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
  if(lines.length<1){ outputEl.value='Enter at least one public key (10 recommended).'; return; }
  // selector
  const sel = selectorEl.value.trim();
  if(!/^[0-9]{5}$/.test(sel)){ outputEl.value='Selector must be 5 digits (0-9).'; return; }

  // map each digit to key index (1-10). digit '0' -> position 10
  const selectedKeys = [];
  for(const d of sel){
    const pos = (d==='0')?10:parseInt(d,10);
    // convert 1-based pos to array index (wrap if out of range)
    const idx = ((pos-1) % lines.length + lines.length) % lines.length;
    const parsed = tryParseKey(lines[idx]);
    if(!parsed){ outputEl.value='Failed to parse key at position '+(idx+1); return; }
    selectedKeys.push(parsed);
  }

  // XOR keys together sequentially -> derive key
  const xorResult = xorBuffers(selectedKeys);
  // derive 16-byte key: take first 16 bytes (pad with zeros if needed)
  const derived = new Uint8Array(16);
  derived.set(xorResult.slice(0,16));

  // prepare plaintext bytes
  let plainTextObj;
  try{ plainTextObj = JSON.parse(plaintextEl.value); }catch(e){ plainTextObj = {text: plaintextEl.value}; }
  const plainBytes = new TextEncoder().encode(JSON.stringify(plainTextObj));

  // associated data can be meta; use selector + count
  const ad = new TextEncoder().encode('sel:'+sel+';count:'+selectedKeys.length);

  try{
    const cipherBytes = await asconAead128Encrypt(plainBytes, derived, ad);
    const b64 = bytesToBase64(cipherBytes);
    const packaged = {com:1, value: b64};
    outputEl.value = JSON.stringify(packaged, null, 2);
    // if connected and mqtt topic provided, publish automatically
    if(mqttClient && mqttClient.connected){
      const topic = mqttTopicPubEl.value || mqttTopicPubEl.placeholder || 'demo/pub';
      mqttClient.publish(topic, JSON.stringify(packaged), {qos:1, retain:false}, (err)=>{
        if(err) appendLog('Publish error: '+err);
        else appendLog('Published to '+topic);
      });
    }
  }catch(err){
    outputEl.value = 'Encryption failed: '+err;
  }
});

// MQTT functions
function buildBrokerUrl(){
  const v = mqttUrlEl.value.trim();
  if(v) return v;
  return '';
}

btnConnect.addEventListener('click', ()=>{
  if(mqttClient && mqttClient.connected){ appendLog('Already connected'); return; }
  const url = buildBrokerUrl();
  const clientId = mqttClientIdEl.value || ('web_client_'+Math.floor(Math.random()*10000));
  const opts = {clientId, username: mqttUserEl.value || undefined, password: mqttPassEl.value || undefined, keepalive: 30, reconnectPeriod: 5000};
  if(!url){ appendLog('Broker URL is required (e.g. wss://broker:port/mqtt)'); return; }
  try{
    mqttClient = mqtt.connect(url, opts);
  }catch(e){ appendLog('Connect error: '+e); return; }

  mqttClient.on('connect', ()=>{ appendLog('MQTT connected'); });
  mqttClient.on('reconnect', ()=>{ appendLog('MQTT reconnecting...'); });
  mqttClient.on('close', ()=>{ appendLog('MQTT closed'); });
  mqttClient.on('error', (err)=>{ appendLog('MQTT error: '+err); });
  mqttClient.on('message', (topic, message)=>{
    let text = message.toString();
    appendLog('MSG '+topic+': '+text);
  });
});

btnDisconnect.addEventListener('click', ()=>{
  if(!mqttClient){ appendLog('Not connected'); return; }
  try{ mqttClient.end(true); appendLog('Disconnect requested'); }catch(e){ appendLog('Disconnect error: '+e); }
});

btnSubscribe.addEventListener('click', ()=>{
  if(!mqttClient || !mqttClient.connected){ appendLog('Not connected'); return; }
  const topic = mqttTopicSubEl.value || mqttTopicSubEl.placeholder || 'demo/sub';
  mqttClient.subscribe(topic, {qos:1}, (err)=>{ if(err) appendLog('Subscribe error: '+err); else appendLog('Subscribed '+topic); });
});

btnUnsubscribe.addEventListener('click', ()=>{
  if(!mqttClient || !mqttClient.connected){ appendLog('Not connected'); return; }
  const topic = mqttTopicSubEl.value || mqttTopicSubEl.placeholder || 'demo/sub';
  mqttClient.unsubscribe(topic, (err)=>{ if(err) appendLog('Unsubscribe error: '+err); else appendLog('Unsubscribed '+topic); });
});

// expose some helpers for debugging
window._debug = {xorBuffers, tryParseKey};
