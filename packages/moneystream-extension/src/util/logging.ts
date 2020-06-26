import debugFactory from 'debug'

export function makeLogger(namespace?: string) {
  return debugFactory(
    namespace ? `moneystream-extension:${namespace}` : 'moneystream-extension'
  )
}
