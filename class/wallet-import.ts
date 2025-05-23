import bip38 from 'bip38';
import wif from 'wif';

import loc from '../loc';
import {
  HDAezeedWallet,
  HDLegacyBreadwalletWallet,
  HDLegacyElectrumSeedP2PKHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
  HDSegwitElectrumSeedP2WPKHWallet,
  HDSegwitP2SHWallet,
  LegacyWallet,
  LightningCustodianWallet,
  MultisigHDWallet,
  SegwitBech32Wallet,
  SegwitP2SHWallet,
  SLIP39LegacyP2PKHWallet,
  SLIP39SegwitBech32Wallet,
  SLIP39SegwitP2SHWallet,
  WatchOnlyWallet,
} from '.';
import bip39WalletFormats from './bip39_wallet_formats.json'; // https://github.com/spesmilo/electrum/blob/master/electrum/bip39_wallet_formats.json
import bip39WalletFormatsBlueWallet from './bip39_wallet_formats_bluewallet.json';
import type { TWallet } from './wallets/types';

// https://github.com/bitcoinjs/bip32/blob/master/ts-src/bip32.ts#L43
export const validateBip32 = (path: string) => path.match(/^(m\/)?(\d+'?\/)*\d+'?$/) !== null;

type TReturn = {
  cancelled: boolean;
  stopped: boolean;
  wallets: TWallet[];
};

/**
 * Function that starts wallet search and import process. It has async generator inside, so
 * that the process can be stoped at any time. It reporst all the progress through callbacks.
 *
 * @param askPassphrase {boolean} If true import process will call onPassword callback for wallet with optional password.
 * @param searchAccounts {boolean} If true import process will scan for all known derivation path from bip39_wallet_formats.json. If false it will use limited version.
 * @param onProgress {function} Callback to report scanning progress
 * @param onWallet {function} Callback to report wallet found
 * @param onPassword {function} Callback to ask for password if needed
 * @returns {{promise: Promise, stop: function}}
 */
const startImport = (
  importTextOrig: string,
  askPassphrase: boolean = false,
  searchAccounts: boolean = false,
  onProgress: (name: string) => void,
  onWallet: (wallet: TWallet) => void,
  onPassword: (title: string, text: string) => Promise<string>,
): { promise: Promise<TReturn>; stop: () => void } => {
  // state
  let promiseResolve: (arg: TReturn) => void;
  let promiseReject: (reason?: any) => void;
  let running = true; // if you put it to false, internal generator stops
  const wallets: TWallet[] = [];
  const promise = new Promise<TReturn>((resolve, reject) => {
    promiseResolve = resolve;
    promiseReject = reject;
  });

  // actions
  const reportProgress = (name: string) => {
    onProgress(name);
  };
  const reportFinish = (cancelled: boolean = false, stopped: boolean = false) => {
    promiseResolve({ cancelled, stopped, wallets });
  };
  const reportWallet = (wallet: TWallet) => {
    if (wallets.some(w => w.getID() === wallet.getID())) return; // do not add duplicates
    wallets.push(wallet);
    onWallet(wallet);
  };
  const stop = () => (running = false);

  async function* importGenerator() {
    // The plan:
    // -3. ask for password, if needed and validate it
    // -2. check if BIP38 encrypted
    // -1a. check if multisig
    // -1. check lightning custodian
    // 0. check if its HDSegwitBech32Wallet (BIP84)
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 3.1 check HD Electrum legacy
    // 3.2 check if its AEZEED
    // 3.3 check if its SLIP39
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO
    // 8. check if its a json array from BC-UR with multiple accounts
    let text = importTextOrig.trim();
    let password;
    console.log("StartImport:", "1");

    // BIP38 password required
    if (text.startsWith('6P')) {
      console.log("StartImport:", "2");
      do {
        password = await onPassword(loc.wallets.looks_like_bip38, loc.wallets.enter_bip38_password);
      } while (!password);
    }

    // HD BIP39 wallet password is optinal
    const hd = new HDSegwitBech32Wallet();
    console.log("StartImport:", "3");
    hd.setSecret(text);
    if (askPassphrase && hd.validateMnemonic()) {
      console.log("StartImport:", "4");
      password = await onPassword(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
    }

    // AEZEED password needs to be correct
    const aezeed = new HDAezeedWallet();
    console.log("StartImport:", "5");
    aezeed.setSecret(text);
    if (await aezeed.mnemonicInvalidPassword()) {
      console.log("StartImport:", "6");
      do {
        password = await onPassword('', loc.wallets.enter_bip38_password);
        aezeed.setPassphrase(password);
      } while (await aezeed.mnemonicInvalidPassword());
    }
    console.log("StartImport:", "7");

    // SLIP39 wallet password is optinal
    if (askPassphrase && text.includes('\n')) {
      console.log("StartImport:", "8");
      const s1 = new SLIP39SegwitP2SHWallet();
      s1.setSecret(text);

      if (s1.validateMnemonic()) {
        password = await onPassword(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
      }
    }

    // ELECTRUM segwit wallet password is optinal
    const electrum1 = new HDSegwitElectrumSeedP2WPKHWallet();
    console.log("StartImport:", "9");
    electrum1.setSecret(text);
    if (askPassphrase && electrum1.validateMnemonic()) {
      console.log("StartImport:", "10");
      password = await onPassword(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
    }

    // ELECTRUM legacy wallet password is optinal
    const electrum2 = new HDLegacyElectrumSeedP2PKHWallet();
    console.log("StartImport:", "11");
    electrum2.setSecret(text);
    if (askPassphrase && electrum2.validateMnemonic()) {
      console.log("StartImport:", "12");
      password = await onPassword(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
    }

    console.log("StartImport:", "13");
    // is it bip38 encrypted
    if (text.startsWith('6P') && password) {
      console.log("StartImport:", "14");
      const decryptedKey = await bip38.decryptAsync(text, password);

      if (decryptedKey) {
        text = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);
      }
    }

    // is it multisig?
    yield { progress: 'multisignature' };
    const ms = new MultisigHDWallet();
    console.log("StartImport:", "15");
    ms.setSecret(text);
    if (ms.getN() > 0 && ms.getM() > 0) {
      await ms.fetchBalance();
      yield { wallet: ms };
    }

    // is it lightning custodian?
    yield { progress: 'lightning custodian' };
    if (text.startsWith('blitzhub://') || text.startsWith('lndhub://')) {
      const lnd = new LightningCustodianWallet();
      if (text.includes('@')) {
        const split = text.split('@');
        lnd.setBaseURI(split[1]);
        lnd.setSecret(split[0]);
      }
      await lnd.init();
      await lnd.authorize();
      await lnd.fetchTransactions();
      await lnd.fetchUserInvoices();
      await lnd.fetchPendingTransactions();
      await lnd.fetchBalance();
      yield { wallet: lnd };
    }

    // check bip39 wallets
    yield { progress: 'bip39' };
    const hd2 = new HDSegwitBech32Wallet();
    console.log("StartImport:", "16");
    hd2.setSecret(text);
    console.log("StartImport:", "17");
    if (password) {
      hd2.setPassphrase(password);
    }
    if (hd2.validateMnemonic()) {
      let walletFound = false;
      // by default we don't try all the paths and options
      const searchPaths = searchAccounts ? bip39WalletFormats : bip39WalletFormatsBlueWallet;
      for (const i of searchPaths) {
        // we need to skip m/0' p2pkh from default scan list. It could be a BRD wallet and will be handled later
        if (i.derivation_path === "m/0'" && i.script_type === 'p2pkh') continue;
        let paths;
        if (i.iterate_accounts && searchAccounts) {
          const basicPath = i.derivation_path.slice(0, -2); // remove 0' from the end
          paths = [...Array(10).keys()].map(j => basicPath + j + "'"); // add account number
        } else {
          paths = [i.derivation_path];
        }
        let WalletClass;
        switch (i.script_type) {
          case 'p2pkh':
            WalletClass = HDLegacyP2PKHWallet;
            break;
          case 'p2wpkh-p2sh':
            WalletClass = HDSegwitP2SHWallet;
            break;
          default:
            // p2wpkh
            WalletClass = HDSegwitBech32Wallet;
        }
        for (const path of paths) {
          const wallet = new WalletClass();
          wallet.setSecret(text);
          if (password) {
            wallet.setPassphrase(password);
          }
          wallet.setDerivationPath(path);
          yield { progress: `bip39 ${i.script_type} ${path}` };
          if (await wallet.wasEverUsed()) {
            yield { wallet };
            walletFound = true;
          } else {
            break; // don't check second account if first one is empty
          }
        }
      }

      // m/0' p2pkh is a special case. It could be regular a HD wallet or a BRD wallet.
      // to decide which one is it let's compare number of transactions
      const m0Legacy = new HDLegacyP2PKHWallet();
      m0Legacy.setSecret(text);
      if (password) {
        m0Legacy.setPassphrase(password);
      }
      m0Legacy.setDerivationPath("m/0'");
      yield { progress: "bip39 p2pkh m/0'" };
      // BRD doesn't support passphrase and only works with 12 words seeds
      if (!password && text.split(' ').length === 12) {
        const brd = new HDLegacyBreadwalletWallet();
        brd.setSecret(text);

        if (await m0Legacy.wasEverUsed()) {
          await m0Legacy.fetchBalance();
          await m0Legacy.fetchTransactions();
          yield { progress: 'BRD' };
          await brd.fetchBalance();
          await brd.fetchTransactions();
          if (brd.getTransactions().length > m0Legacy.getTransactions().length) {
            yield { wallet: brd };
          } else {
            yield { wallet: m0Legacy };
          }
          walletFound = true;
        }
      } else {
        if (await m0Legacy.wasEverUsed()) {
          yield { wallet: m0Legacy };
          walletFound = true;
        }
      }

      // if we havent found any wallet for this seed suggest new bech32 wallet
      if (!walletFound) {
        yield { wallet: hd2 };
      }
      // return;
    }

    yield { progress: 'wif' };
    const segwitWallet = new SegwitP2SHWallet();
    console.log("StartImport:", "18");
    segwitWallet.setSecret(text);
    console.log("StartImport:", "19");
    if (segwitWallet.getAddress()) {
      console.log("StartImport:", "20");
      // ok its a valid WIF
      let walletFound = false;

      yield { progress: 'wif p2wpkh' };
      const segwitBech32Wallet = new SegwitBech32Wallet();
      console.log("StartImport:", "21");
      segwitBech32Wallet.setSecret(text);
      console.log("StartImport:", "22");
      if (await segwitBech32Wallet.wasEverUsed()) {
        console.log("StartImport:", "was ever used");
        // yep, its single-address bech32 wallet
        await segwitBech32Wallet.fetchBalance();
        console.log("StartImport:", "24");
        walletFound = true;
        yield { wallet: segwitBech32Wallet };
      }
      console.log("StartImport:", "25");

      yield { progress: 'wif p2wpkh-p2sh' };
      console.log("StartImport:", "26");
      if (await segwitWallet.wasEverUsed()) {
        console.log("StartImport:", "27");
        // yep, its single-address p2wpkh wallet
        await segwitWallet.fetchBalance();
        walletFound = true;
        yield { wallet: segwitWallet };
      }

      // default wallet is Legacy
      yield { progress: 'wif p2pkh' };
      const legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(text);
      if (await legacyWallet.wasEverUsed()) {
        // yep, its single-address legacy wallet
        await legacyWallet.fetchBalance();
        walletFound = true;
        yield { wallet: legacyWallet };
      }

      // if no wallets was ever used, import all of them
      if (!walletFound) {
        yield { wallet: segwitBech32Wallet };
        yield { wallet: segwitWallet };
        yield { wallet: legacyWallet };
      }
    }

    // case - WIF is valid, just has uncompressed pubkey
    yield { progress: 'wif p2pkh' };
    const legacyWallet = new LegacyWallet();
    legacyWallet.setSecret(text);
    if (legacyWallet.getAddress()) {
      await legacyWallet.fetchBalance();
      await legacyWallet.fetchTransactions();
      yield { wallet: legacyWallet };
    }

    // maybe its a watch-only address?
    yield { progress: 'watch only' };
    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret(text);
    if (watchOnly.valid()) {
      await watchOnly.fetchBalance();
      yield { wallet: watchOnly };
    }

    // electrum p2wpkh-p2sh
    yield { progress: 'electrum p2wpkh-p2sh' };
    const el1 = new HDSegwitElectrumSeedP2WPKHWallet();
    el1.setSecret(text);
    if (password) {
      el1.setPassphrase(password);
    }
    if (el1.validateMnemonic()) {
      yield { wallet: el1 }; // not fetching txs or balances, fuck it, yolo, life is too short
    }

    // electrum p2wpkh-p2sh
    yield { progress: 'electrum p2pkh' };
    const el2 = new HDLegacyElectrumSeedP2PKHWallet();
    el2.setSecret(text);
    if (password) {
      el2.setPassphrase(password);
    }
    if (el2.validateMnemonic()) {
      yield { wallet: el2 }; // not fetching txs or balances, fuck it, yolo, life is too short
    }

    // is it AEZEED?
    yield { progress: 'aezeed' };
    const aezeed2 = new HDAezeedWallet();
    aezeed2.setSecret(text);
    if (password) {
      aezeed2.setPassphrase(password);
    }
    if (await aezeed2.validateMnemonicAsync()) {
      yield { wallet: aezeed2 }; // not fetching txs or balances, fuck it, yolo, life is too short
    }

    // Let's try SLIP39
    yield { progress: 'SLIP39' };
    const s1 = new SLIP39SegwitP2SHWallet();
    s1.setSecret(text);

    if (s1.validateMnemonic()) {
      yield { progress: 'SLIP39 p2wpkh-p2sh' };
      if (password) {
        s1.setPassphrase(password);
      }
      if (await s1.wasEverUsed()) {
        yield { wallet: s1 };
      }

      yield { progress: 'SLIP39 p2pkh' };
      const s2 = new SLIP39LegacyP2PKHWallet();
      if (password) {
        s2.setPassphrase(password);
      }
      s2.setSecret(text);
      if (await s2.wasEverUsed()) {
        yield { wallet: s2 };
      }

      yield { progress: 'SLIP39 p2wpkh' };
      const s3 = new SLIP39SegwitBech32Wallet();
      s3.setSecret(text);
      if (password) {
        s3.setPassphrase(password);
      }
      yield { wallet: s3 };
    }

    // is it BC-UR payload with multiple accounts?
    yield { progress: 'BC-UR' };
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        for (const account of json) {
          if (account.ExtPubKey && account.MasterFingerprint && account.AccountKeyPath) {
            const wallet = new WatchOnlyWallet();
            wallet.setSecret(JSON.stringify(account));
            wallet.init();
            yield { wallet };
          }
        }
      }
    } catch (_) {}
  }

  // POEHALI
  (async () => {
    const generator = importGenerator();
    while (true) {
      const next = await generator.next();
      if (!running) throw new Error('Discovery stopped'); // break if stop() has been called
      if (next.value?.progress) reportProgress(next.value.progress);
      if (next.value?.wallet) reportWallet(next.value.wallet);
      if (next.done) break; // break if generator has been finished
    }
    reportFinish();
  })().catch(e => {
    if (e.message === 'Cancel Pressed') {
      reportFinish(true);
      return;
    } else if (e.message === 'Discovery stopped') {
      reportFinish(undefined, true);
      return;
    }
    promiseReject(e);
  });

  return { promise, stop };
};

export default startImport;
