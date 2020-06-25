export function addMoneystreamExtensionInstalledMarker(document: Document) {
  // Appending moneystream extension installed marker first so the moneystream site can find it asap.
  document.addEventListener('checkMoneystreamExtension', () => {
    const installedMarker = document.createElement('div')
    installedMarker.setAttribute('id', 'moneystream_extension_installed_marker')
    document.body.appendChild(installedMarker)
    const moneystreamEvent = new Event('addMoneystream')
    document.dispatchEvent(moneystreamEvent)
  })
}
