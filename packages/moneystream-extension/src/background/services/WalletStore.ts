// store private key in local storage for now
// TODO: use keychain or other secure storage

import { IStorage } from 'moneystream-wallet'

export default class WalletStore implements IStorage {
    private wallet_key = 'moneystreamwallet'

    async put(item: string): Promise<any> {
        window.localStorage.setItem(this.wallet_key,item)
        return item
    //     return new Promise(function(resolve, reject) {
    //        chrome.storage.sync.set({'moneystreamwallet':item}, function(){
    //             resolve("var set successfully")
    //             console.log(`put key`)
    //         })
    //     })
    }

    
    get(): string {
        const item = window.localStorage.getItem(this.wallet_key)
        if (!item) return ''
        return item
    //     var p = new Promise(function(resolve, reject){
    //         chrome.storage.local.get('moneystreamwallet', function(options){
    //             resolve(options.disableautoplay);
    //         })
    //     })
    //     const walletContents = await p
    //     return walletContents
    }

    tryget(): string | null {
        try {
            return this.get()
        }
        catch (err) {
            console.error(err)
            return null
        }
    }

    backup(): void {
        throw new Error("Method not implemented.");
    }

}