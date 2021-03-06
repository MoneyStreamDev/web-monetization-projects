import MessageSender = chrome.runtime.MessageSender
import { notNullOrUndef } from './nullables'

export function getTab(sender: { tab?: { id?: number } }): number {
  // what does it mean if gettin null here???
  return notNullOrUndef(notNullOrUndef(sender.tab, 'sender.tab').id, 'tab.id')
}

export function getFrameSpec(sender: MessageSender) {
  const tabId = getTab(sender)
  const frameId = notNullOrUndef(sender.frameId, 'sender.frameId')
  const spec = { tabId, frameId }
  return { ...spec, spec }
}
