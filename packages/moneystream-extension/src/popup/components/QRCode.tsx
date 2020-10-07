import React from 'react'
import QRCode from 'qrcode.react'

export function QRCodeImport (props:any) {
    return (
        <QRCode value={props.address} />
    )
}