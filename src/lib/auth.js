import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'b2b-platform-secret-key-at-least-32-chars-long';

function base64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binString = '';
  for (let i = 0; i < bytes.length; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binString = atob(base64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getCryptoKey() {
  const enc = new TextEncoder();
  const keyData = enc.encode(JWT_SECRET);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign payload to generate JWT
 * @param {object} payload 
 * @param {number} expiresInMs 
 * @returns {Promise<string>}
 */
export async function signJWT(payload, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const exp = Date.now() + expiresInMs;
  const tokenPayload = { ...payload, exp };
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(tokenPayload));
  const textToSign = `${encodedHeader}.${encodedPayload}`;
  
  const key = await getCryptoKey();
  const signatureBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(textToSign)
  );
  
  const signatureBytes = new Uint8Array(signatureBuf);
  let signatureBin = '';
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureBin += String.fromCharCode(signatureBytes[i]);
  }
  const signature = btoa(signatureBin)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${textToSign}.${signature}`;
}

/**
 * Verify and decode JWT
 * @param {string} token 
 * @returns {Promise<object|null>}
 */
export async function verifyJWT(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    
    const key = await getCryptoKey();
    const textToVerify = `${header}.${payload}`;
    
    let base64Sig = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Sig.length % 4) {
      base64Sig += '=';
    }
    const signatureBin = atob(base64Sig);
    const signatureBytes = new Uint8Array(signatureBin.length);
    for (let i = 0; i < signatureBin.length; i++) {
      signatureBytes[i] = signatureBin.charCodeAt(i);
    }
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(textToVerify)
    );
    
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(base64urlDecode(payload));
    if (decodedPayload.exp && Date.now() > decodedPayload.exp) {
      return null;
    }
    return decodedPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Hash password with bcryptjs
 * @param {string} password 
 * @returns {string}
 */
export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

/**
 * Compare password with hashed password
 * @param {string} password 
 * @param {string} hash 
 * @returns {boolean}
 */
export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}
