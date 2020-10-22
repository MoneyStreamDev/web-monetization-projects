import React, {useEffect, useState} from 'react'
import useScript from 'react-script-hook'

declare global {
    interface Window { relayone: any; }
}

window.relayone = window.relayone || null

export function RelayXButton(props:any) {
    const [refresh, setRefresh] = useState(0)
    const [loading, error] = useScript({ src: 'https://one.relayx.io/relayone.js',
        onload: () => setupPayment()
    })

    const setupPayment = () => {
        console.log('Relay loaded!')
        setRefresh(refresh + 1)
    }

    const onPayment = (payment:any) => { props.onPayment(payment) }

    useEffect(() => {
        const div = document.querySelector('#relayx-button')
        const relayx:any = window.relayone || null
        console.log(relayx)
        if (relayx) {
            relayx.render(div, {
                to: props.to,
                amount:"0.05",
                editable: true,
                currency: "USD",
                onPayment: onPayment
            })
        } else {
            if (div) div.innerHTML="Could not render relayx"
            else console.error("could not render relayx")
        }
    },[loading, refresh])

    if (loading) return <h3>Loading RelayX button...</h3>
    if (error) return <h3>Failed to load RelayX: {error.message}</h3>

    return (
        <div id="relayx-button"></div>
    )
}