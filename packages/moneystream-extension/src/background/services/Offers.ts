// offers from web sites user visited
// example: {"session":"http://127.0.0.1:4444/test.html","amount":25,"denomination":"cent","rate":"total","duration":"0:2:34"}
export class Offers {
    private _offers: any[] = []

    add (offer: any) {
        this._offers.push(offer)
    }

    findUrl (url:string) {
        const found = this._offers.find( o => o.session === url )
        console.log(`foundoffer`, found)
        return found
    }
}