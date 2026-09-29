/**
 * Web Crypto AES-GCM 加密工具
 *
 * 架构说明（两层设计）：
 *   Layer 1: Master Key (K) —— 一次性随机生成的 256-bit AES-GCM 密钥
 *   Layer 2: Wrapping Key (S) —— 从源码硬编码的 salt 派生，用来加密 K
 *
 * localStorage 里存的不是 Master Key 明文，而是：
 *   { wrappedMasterKey (AES-GCM(K, S, nonceK)), nonceK }
 *
 * 当保存用户 API Key 时：
 *   apiKey 明文 --[用 Master Key 加密]--> { ciphertext, nonce }
 *   存入 localStorage
 *
 * 当加载 API Key 时：
 *   1. 用 Wrapping Key + nonceK 解密 wrappedMasterKey，得到 Master Key
 *   2. 用 Master Key + nonce 解密 ciphertext
 *
 * 注意：Wrapping Key 来自源码硬编码，任何人反编译 bundle 都能拿到。
 * 但这比明文存 API Key 强得多——它阻止了：
 *   - 普通用户 DevTools 里直接读到 key
 *   - localStorage 导出工具直接拿到明文
 * 如果未来需要密码保护，可以加一层 PBKDF2 派生的用户密钥做第三层。
 */

const HARDCODED_SALT = 'kw-personal-workspace-v1\x00\x01\x02\x03kw-ai-secret-chain';
const STORAGE_KEY = 'kw_ai_key_chain';

/** 从硬编码 salt 派生 AES-GCM wrapping key */
async function getWrappingKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = enc.encode(HARDCODED_SALT);
  const hash = await crypto.subtle.digest('SHA-256', raw);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 生成 256-bit 随机 AES-GCM 主密钥 */
async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

/** 将 CryptoKey 导出为 raw 字节 */
async function exportRawKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

/** 从 raw 字节导入 CryptoKey */
async function importRawKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

/** ArrayBuffer → base64 string */
function ab2b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** base64 string → ArrayBuffer */
function b642ab(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/** AES-GCM 加密（输入输出都是 base64） */
async function encrypt(plainText: string, key: CryptoKey): Promise<{ ciphertext: string; nonce: string }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    enc.encode(plainText),
  );
  return { ciphertext: ab2b64(ciphertext), nonce: ab2b64(nonce.buffer) };
}

/** AES-GCM 解密 */
async function decrypt(ciphertext: string, nonce: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642ab(nonce) },
    key,
    b642ab(ciphertext),
  );
  return dec.decode(plain);
}

interface KeyChainStorage {
  /** Master Key 被 Wrapping Key 加密后的密文 */
  wrappedMasterKey: string;
  /** 加密 Master Key 时用的 nonce */
  masterNonce: string;
  /** 用户 API Key 密文（undefined = 未设置） */
  encryptedApiKey?: string;
  /** 加密 API Key 时用的 nonce */
  apiKeyNonce?: string;
  /** provider 标识（deepseek | openai | custom） */
  provider?: string;
  /** 自定义 baseURL（provider=custom 时用） */
  customBaseURL?: string;
  /** 模型名称 */
  model?: string;
  /** 版本号，将来迁移时用 */
  version: number;
}

/**
 * 确保本地有一套可用的 Master Key 链。
 * - 有就返回已解密的 Master Key CryptoKey
 * - 没有就生成新的，wrap 后存 localStorage
 */
async function ensureMasterKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const chain: KeyChainStorage = JSON.parse(stored);
      const wrappingKey = await getWrappingKey();
      const rawMaster = await decrypt(chain.wrappedMasterKey, chain.masterNonce, wrappingKey);
      return importRawKey(b642ab(rawMaster));
    } catch {
      // 链损坏 → 重建（会导致之前的 API Key 丢失，但用户可以重填）
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // 生成新链
  const master = await generateMasterKey();
  const wrappingKey = await getWrappingKey();
  const rawMaster = await exportRawKey(master);
  const masterB64 = ab2b64(rawMaster);
  const { ciphertext: wrapped, nonce: nonceK } = await encrypt(masterB64, wrappingKey);

  const chain: KeyChainStorage = {
    wrappedMasterKey: wrapped,
    masterNonce: nonceK,
    version: 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
  return master;
}

/** 保存 API Key（加密存储） */
export async function saveApiKey(params: {
  apiKey: string;
  provider: string;
  customBaseURL?: string;
  model: string;
}): Promise<void> {
  const master = await ensureMasterKey();
  const { ciphertext, nonce } = await encrypt(params.apiKey, master);

  const stored = localStorage.getItem(STORAGE_KEY);
  const chain: KeyChainStorage = stored
    ? JSON.parse(stored)
    : { wrappedMasterKey: '', masterNonce: '', version: 1 };

  chain.encryptedApiKey = ciphertext;
  chain.apiKeyNonce = nonce;
  chain.provider = params.provider;
  chain.customBaseURL = params.customBaseURL;
  chain.model = params.model;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
}

/** 加载 API Key（解密后返回，没有返回 null） */
export async function loadApiKey(): Promise<{
  apiKey: string;
  provider: string;
  customBaseURL?: string;
  model: string;
} | null> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  const chain: KeyChainStorage = JSON.parse(stored);
  if (!chain.encryptedApiKey || !chain.apiKeyNonce) return null;

  try {
    const master = await ensureMasterKey();
    const apiKey = await decrypt(chain.encryptedApiKey, chain.apiKeyNonce, master);
    return {
      apiKey,
      provider: chain.provider || 'deepseek',
      customBaseURL: chain.customBaseURL,
      model: chain.model || 'deepseek-chat',
    };
  } catch {
    return null;
  }
}

/** 清除 API Key（保留 Master Key 链，因为 Wrapping Key 已暴露） */
export async function clearApiKey(): Promise<void> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  const chain: KeyChainStorage = JSON.parse(stored);
  delete chain.encryptedApiKey;
  delete chain.apiKeyNonce;
  delete chain.provider;
  delete chain.customBaseURL;
  delete chain.model;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chain));
}

/** 检查是否已配置 API Key（不泄漏 key 本身） */
export function hasApiKeyConfigured(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  try {
    const chain: KeyChainStorage = JSON.parse(stored);
    return !!chain.encryptedApiKey;
  } catch { return false; }
}

/** 获取配置了的 provider / model 描述，用于设置 UI 展示 */
export function getApiKeyMeta(): { provider: string; model: string; configured: boolean } {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return { provider: '', model: '', configured: false };
  try {
    const chain: KeyChainStorage = JSON.parse(stored);
    return {
      provider: chain.provider || '',
      model: chain.model || '',
      configured: !!chain.encryptedApiKey,
    };
  } catch {
    return { provider: '', model: '', configured: false };
  }
}
